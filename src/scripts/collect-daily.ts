#!/usr/bin/env node
/**
 * Daily collection orchestrator.
 *
 * Usage:
 *   npx tsx src/scripts/collect-daily.ts [options]
 *
 * Options:
 *   --date <YYYY-MM-DD>     Date folder (default: today local time)
 *   --concurrency <n>       Max concurrent calls (default: 8)
 *   --delay <ms>            Delay between calls to the same platform (default: 1500)
 *   --skip-collect          Skip websculpt collection, only normalize + merge
 *   --skip-normalize        Skip normalize + merge, only collect
 */

import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { COLLECT_PLAN, interleaveCalls } from "../config/collect-plan.js";
import { runAllCalls } from "../lib/runner.js";
import { mergeNormalized } from "./merge-normalized.js";
import { normalizeBatch } from "./normalize-batch.js";

interface CliOptions {
	date: string;
	concurrency: number;
	interCallDelayMs: number;
	skipCollect: boolean;
	skipNormalize: boolean;
}

function formatDate(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function parseArgs(): CliOptions {
	const args = process.argv.slice(2);

	const dateFlag = args.indexOf("--date");
	const concurrencyFlag = args.indexOf("--concurrency");
	const delayFlag = args.indexOf("--delay");

	const date = dateFlag !== -1 ? args[dateFlag + 1] : formatDate(new Date());
	const concurrency = concurrencyFlag !== -1 ? Number(args[concurrencyFlag + 1]) : 8;
	const interCallDelayMs = delayFlag !== -1 ? Number(args[delayFlag + 1]) : 1500;

	if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		console.error("Invalid --date format. Expected YYYY-MM-DD.");
		process.exit(1);
	}
	if (Number.isNaN(concurrency) || concurrency < 1) {
		console.error("Invalid --concurrency. Expected positive number.");
		process.exit(1);
	}
	if (Number.isNaN(interCallDelayMs) || interCallDelayMs < 0) {
		console.error("Invalid --delay. Expected non-negative number.");
		process.exit(1);
	}

	return {
		date,
		concurrency,
		interCallDelayMs,
		skipCollect: args.includes("--skip-collect"),
		skipNormalize: args.includes("--skip-normalize"),
	};
}

async function main(): Promise<void> {
	const options = parseArgs();
	const { date, concurrency, interCallDelayMs, skipCollect, skipNormalize } = options;

	const rawDir = path.join("data", "raw", date);
	const normalizedDir = path.join("data", "normalized", date);
	const dailyDir = path.join("data", "daily", date);

	mkdirSync(rawDir, { recursive: true });
	mkdirSync(normalizedDir, { recursive: true });
	mkdirSync(dailyDir, { recursive: true });

	const startedAt = new Date().toISOString();
	let callResults: import("../lib/runner.js").CallResult[] = [];

	if (!skipCollect) {
		const calls = interleaveCalls(COLLECT_PLAN);
		console.log(`\nStarting daily collection for ${date}`);
		console.log(
			`Total calls: ${calls.length}, concurrency: ${concurrency}, inter-call delay: ${interCallDelayMs}ms\n`,
		);
		callResults = await runAllCalls(calls, rawDir, concurrency, interCallDelayMs);

		const successCount = callResults.filter((r) => r.status === "success").length;
		const failCount = callResults.length - successCount;
		console.log(`\nCollection done. Success: ${successCount}, Failed: ${failCount}\n`);
	} else {
		console.log("Skipping collection (--skip-collect).\n");
	}

	if (!skipNormalize) {
		console.log("Running normalize batch...\n");
		await normalizeBatch(rawDir, normalizedDir);

		console.log("\nMerging normalized outputs...\n");
		const { report } = await mergeNormalized(normalizedDir, dailyDir, date, callResults, startedAt);

		console.log("\n--- Daily Report ---");
		console.log(`Date: ${report.date}`);
		console.log(`Total calls: ${report.total_calls}`);
		console.log(`Successful: ${report.successful_calls}`);
		console.log(`Failed: ${report.failed_calls}`);
		console.log(`Total items: ${report.total_items}`);
		console.log(`Duration: ${new Date(report.finished_at).getTime() - new Date(report.started_at).getTime()}ms`);
	} else {
		console.log("Skipping normalize and merge (--skip-normalize).");
	}
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
