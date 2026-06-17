/**
 * Daily collection orchestrator.
 *
 * Used by the CLI (src/cli.ts). Not a standalone script.
 */

import { mkdirSync } from "node:fs";
import path from "node:path";
import { COLLECT_PLAN, interleaveCalls } from "../config/collect-plan.js";
import type { Logger } from "../lib/logger.js";
import { defaultLogger } from "../lib/logger.js";
import { runMerge } from "../lib/merge-normalized.js";
import { runNormalizeBatch } from "../lib/normalize.js";
import { runAllCalls } from "../lib/runner.js";

const DEFAULT_DATA_DIR = "anytrend-data";

export interface RunCollectDailyOptions {
	date: string;
	concurrency: number;
	interCallDelayMs: number;
	skipCollect: boolean;
	skipNormalize: boolean;
	logger?: Logger;
}

export async function runCollectDaily(options: RunCollectDailyOptions): Promise<void> {
	const logger = options.logger ?? defaultLogger;
	const { date, concurrency, interCallDelayMs, skipCollect, skipNormalize } = options;

	const rawDir = path.join(DEFAULT_DATA_DIR, "raw", date);
	const normalizedDir = path.join(DEFAULT_DATA_DIR, "normalized", date);
	const dailyDir = path.join(DEFAULT_DATA_DIR, "daily", date);

	mkdirSync(rawDir, { recursive: true });
	mkdirSync(normalizedDir, { recursive: true });
	mkdirSync(dailyDir, { recursive: true });

	const startedAt = new Date().toISOString();
	let callResults: import("../lib/runner.js").CallResult[] = [];

	if (!skipCollect) {
		const calls = interleaveCalls(COLLECT_PLAN);
		logger.log(`\nStarting daily collection for ${date}`);
		logger.log(
			`Total calls: ${calls.length}, concurrency: ${concurrency}, inter-call delay: ${interCallDelayMs}ms\n`,
		);
		callResults = await runAllCalls(calls, rawDir, concurrency, interCallDelayMs, logger);

		const successCount = callResults.filter((r) => r.status === "success").length;
		const failCount = callResults.length - successCount;
		logger.log(`\nCollection done. Success: ${successCount}, Failed: ${failCount}\n`);
	} else {
		logger.log("Skipping collection (--skip-collect).\n");
	}

	if (!skipNormalize) {
		logger.log("Running normalize batch...\n");
		await runNormalizeBatch(rawDir, normalizedDir, logger);

		logger.log("\nMerging normalized outputs...\n");
		const { report } = await runMerge(normalizedDir, dailyDir, date, callResults, startedAt, logger);

		logger.log("\n--- Daily Report ---");
		logger.log(`Date: ${report.date}`);
		logger.log(`Total calls: ${report.total_calls}`);
		logger.log(`Successful: ${report.successful_calls}`);
		logger.log(`Failed: ${report.failed_calls}`);
		logger.log(`Total items: ${report.total_items}`);
		logger.log(`Duration: ${new Date(report.finished_at).getTime() - new Date(report.started_at).getTime()}ms`);
	} else {
		logger.log("Skipping normalize and merge (--skip-normalize).");
	}
}
