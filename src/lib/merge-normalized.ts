/**
 * Merge all normalized outputs for a given date into a single daily file.
 *
 * Used by the CLI (src/cli.ts). Not a standalone script.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Logger } from "../lib/logger.js";
import { defaultLogger } from "../lib/logger.js";
import type { CallResult } from "../lib/runner.js";
import type { NormalizedItem, NormalizedOutput } from "../types/index.js";
import { renderDigest } from "./digest-renderer.js";

export interface MergedSourceMeta {
	command: string;
	platform: string;
	angle: string;
	call_params: Record<string, string | number | boolean>;
	normalized_file: string;
	requires_browser: boolean;
	requires_login: boolean;
}

export interface MergedItem extends NormalizedItem {
	_source: MergedSourceMeta;
}

export interface MergedDailyOutput {
	version: string;
	date: string;
	generated_at: string;
	meta: {
		total_calls: number;
		successful_calls: number;
		failed_calls: number;
		total_items: number;
	};
	items: MergedItem[];
}

export interface CollectionReport {
	version: string;
	date: string;
	started_at: string;
	finished_at: string;
	total_calls: number;
	successful_calls: number;
	failed_calls: number;
	total_items: number;
	calls: Array<{
		command: string;
		angle: string;
		output_name: string;
		args: string[];
		resolved_args: string[];
		status: "success" | "error";
		duration_ms: number;
		item_count: number | null;
		error: string | null;
	}>;
}

function argsToRecord(args: string[]): Record<string, string | number | boolean> {
	const record: Record<string, string | number | boolean> = {};
	for (let i = 0; i < args.length; i++) {
		const current = args[i];
		if (current?.startsWith("--")) {
			const key = current.slice(2);
			const next = args[i + 1];
			if (next === undefined || next.startsWith("--")) {
				record[key] = true;
			} else if (next === "true") {
				record[key] = true;
				i++;
			} else if (next === "false") {
				record[key] = false;
				i++;
			} else if (/^-?\d+$/.test(next)) {
				record[key] = Number(next);
				i++;
			} else {
				record[key] = next;
				i++;
			}
		}
	}
	return record;
}

export async function runMerge(
	normalizedDir: string,
	outDir: string,
	date: string,
	callResults?: CallResult[],
	startedAt?: string,
	logger?: Logger,
): Promise<{ merged: MergedDailyOutput; report: CollectionReport }> {
	const log = logger ?? defaultLogger;

	mkdirSync(outDir, { recursive: true });

	const files = readdirSync(normalizedDir)
		.filter((f) => f.endsWith(".json"))
		.sort();

	let totalItems = 0;
	const items: MergedItem[] = [];
	const digestDir = path.join(outDir, "digest");
	mkdirSync(digestDir, { recursive: true });

	// The runner estimates item_count from the raw websculpt output shape, which
	// can be inaccurate for adapters that flatten nested arrays. We record the
	// authoritative count from each successful normalized file and use it when
	// building the collection report.
	const normalizedItemCounts = new Map<string, number>();

	for (const file of files) {
		const filePath = path.join(normalizedDir, file);
		let output: NormalizedOutput;
		try {
			output = JSON.parse(readFileSync(filePath, "utf-8")) as NormalizedOutput;
		} catch {
			log.error(`SKIP: ${file} is not valid JSON`);
			continue;
		}

		if (!output.response_meta?.success) {
			log.log(`SKIP: ${file} (normalize failed)`);
			continue;
		}

		const sourceMeta: MergedSourceMeta = {
			command: output.command,
			platform: output.platform,
			angle: output.platform,
			call_params: {},
			normalized_file: file,
			requires_browser: false,
			requires_login: false,
		};

		// Enrich source metadata with collection-plan info when available.
		if (callResults) {
			const resultMap = new Map(callResults.map((r) => [r.call.outputName, r]));
			const outputName = file.replace(/\.json$/, "");
			const result = resultMap.get(outputName);
			if (result) {
				sourceMeta.angle = result.call.angle;
				sourceMeta.call_params = argsToRecord(result.resolvedArgs);
				sourceMeta.requires_browser = result.call.requiresBrowser;
				sourceMeta.requires_login = result.call.requiresLogin;
			}
		}

		for (const item of output.items) {
			items.push({
				...item,
				_source: { ...sourceMeta },
			});
		}
		totalItems += output.items.length;

		const outputName = file.replace(/\.json$/, "");
		normalizedItemCounts.set(outputName, output.items.length);
		try {
			const digestMarkdown = renderDigest(output, sourceMeta.angle);
			const digestPath = path.join(digestDir, `${outputName}.md`);
			writeFileSync(digestPath, digestMarkdown, "utf-8");
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			log.warn(`Digest render/write failed for ${outputName}: ${message}`);
		}
	}

	const successfulCalls = callResults?.filter((r) => r.status === "success").length ?? 0;
	const failedCalls = (callResults?.length ?? 0) - successfulCalls;
	const totalCalls = callResults?.length ?? files.length;
	const successfulCallsReport = callResults ? successfulCalls : files.length;

	const merged: MergedDailyOutput = {
		version: "1.0",
		date,
		generated_at: new Date().toISOString(),
		meta: {
			total_calls: totalCalls,
			successful_calls: successfulCallsReport,
			failed_calls: failedCalls,
			total_items: totalItems,
		},
		items,
	};

	const report: CollectionReport = {
		version: "1.0",
		date,
		started_at: startedAt ?? new Date().toISOString(),
		finished_at: new Date().toISOString(),
		total_calls: totalCalls,
		successful_calls: successfulCallsReport,
		failed_calls: failedCalls,
		total_items: totalItems,
		calls:
			callResults?.map((r) => ({
				command: r.call.command,
				angle: r.call.angle,
				output_name: r.call.outputName,
				args: r.call.args,
				resolved_args: r.resolvedArgs,
				status: r.status,
				duration_ms: r.durationMs,
				// Prefer the authoritative normalized item count; fall back to the
				// runner's raw-level estimate for calls with no successful normalized
				// output (e.g. skipped or failed normalization).
				item_count: normalizedItemCounts.get(r.call.outputName) ?? r.itemCount,
				error: r.error,
			})) ?? [],
	};

	const mergedPath = path.join(outDir, "daily-merged.json");
	const reportPath = path.join(outDir, "collection-report.json");

	writeFileSync(mergedPath, `${JSON.stringify(merged, null, 2)}\n`, "utf-8");
	writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");

	log.log(`Merged ${items.length} items into ${mergedPath}`);
	log.log(`Report written to ${reportPath}`);

	return { merged, report };
}
