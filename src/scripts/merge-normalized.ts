#!/usr/bin/env node
/**
 * Merge all normalized outputs for a given date into a single daily file.
 *
 * Usage:
 *   npx tsx src/scripts/merge-normalized.ts \
 *     --normalized-dir data/normalized/2026-06-16 \
 *     --out-dir data/daily/2026-06-16
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { CallResult } from "../lib/runner.js";
import type { NormalizedItem, NormalizedOutput } from "../types/index.js";

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

function parseArgs(): { normalizedDir: string; outDir: string } {
	const args = process.argv.slice(2);
	const normalizedFlag =
		args.indexOf("--normalized-dir") !== -1 ? args.indexOf("--normalized-dir") : args.indexOf("-n");
	const outFlag = args.indexOf("--out-dir") !== -1 ? args.indexOf("--out-dir") : args.indexOf("-o");

	const normalizedDir = args[normalizedFlag + 1];
	const outDir = args[outFlag + 1];

	if (!normalizedDir || !outDir) {
		console.error("Usage: --normalized-dir <dir> --out-dir <dir>");
		process.exit(1);
	}

	return { normalizedDir, outDir };
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

export async function mergeNormalized(
	normalizedDir: string,
	outDir: string,
	date: string,
	callResults?: CallResult[],
	startedAt?: string,
): Promise<{ merged: MergedDailyOutput; report: CollectionReport }> {
	mkdirSync(outDir, { recursive: true });

	const files = readdirSync(normalizedDir)
		.filter((f) => f.endsWith(".json"))
		.sort();

	let totalItems = 0;
	const items: MergedItem[] = [];

	for (const file of files) {
		const filePath = path.join(normalizedDir, file);
		let output: NormalizedOutput;
		try {
			output = JSON.parse(readFileSync(filePath, "utf-8")) as NormalizedOutput;
		} catch {
			console.error(`SKIP: ${file} is not valid JSON`);
			continue;
		}

		if (!output.response_meta?.success) {
			console.log(`SKIP: ${file} (normalize failed)`);
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
				item_count: r.itemCount,
				error: r.error,
			})) ?? [],
	};

	const mergedPath = path.join(outDir, "daily-merged.json");
	const reportPath = path.join(outDir, "collection-report.json");

	writeFileSync(mergedPath, `${JSON.stringify(merged, null, 2)}\n`, "utf-8");
	writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");

	console.log(`Merged ${items.length} items into ${mergedPath}`);
	console.log(`Report written to ${reportPath}`);

	return { merged, report };
}

async function main(): Promise<void> {
	const { normalizedDir, outDir } = parseArgs();
	const date = path.basename(normalizedDir);
	await mergeNormalized(normalizedDir, outDir, date);
}

function isMainModule(): boolean {
	const scriptPath = fileURLToPath(import.meta.url);
	for (const arg of process.argv.slice(1)) {
		try {
			if (fileURLToPath(pathToFileURL(arg).href) === scriptPath) {
				return true;
			}
		} catch {
			// Ignore invalid file URLs.
		}
	}
	return false;
}

if (isMainModule()) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
