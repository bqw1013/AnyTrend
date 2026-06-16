#!/usr/bin/env node
/**
 * AnyTrend CLI entry point.
 *
 * Provides subcommands for collection, normalization, merging,
 * environment diagnostics, and collection plan listing.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { formatDoctorReport, runDoctor } from "./lib/doctor.js";
import type { Logger } from "./lib/logger.js";
import { createLogger } from "./lib/logger.js";
import { formatSourcesTable } from "./lib/sources.js";
import type { RunCollectDailyOptions } from "./scripts/collect-daily.js";
import { runCollectDaily } from "./scripts/collect-daily.js";
import { runMerge } from "./scripts/merge-normalized.js";
import { runNormalize } from "./scripts/normalize.js";
import { runNormalizeBatch } from "./scripts/normalize-batch.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(readFileSync(path.join(__dirname, "..", "package.json"), "utf-8")) as { version: string };

const VERSION = pkg.version;

function formatDate(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function parsePositiveInt(value: string): number {
	const n = Number.parseInt(value, 10);
	if (Number.isNaN(n) || n < 1) {
		throw new Error(`Expected positive number, got "${value}"`);
	}
	return n;
}

function parseNonNegativeInt(value: string): number {
	const n = Number.parseInt(value, 10);
	if (Number.isNaN(n) || n < 0) {
		throw new Error(`Expected non-negative number, got "${value}"`);
	}
	return n;
}

interface GlobalOptions {
	quiet: boolean;
	noColor: boolean;
}

function createCliLogger(opts: GlobalOptions): Logger {
	return createLogger({ quiet: opts.quiet });
}

const program = new Command();

program
	.name("anytrend")
	.description("AI-driven daily trend aggregation CLI")
	.version(VERSION)
	.option("--quiet", "Suppress per-call progress output", false)
	.option("--no-color", "Disable colored output")
	.hook("preAction", (thisCommand) => {
		const opts = thisCommand.optsWithGlobals();
		// picocolors automatically respects NO_COLOR; --no-color also disables
		if (opts.noColor) {
			process.env.NO_COLOR = "1";
		}
	});

// ── collect ──────────────────────────────────────────────────────────

program
	.command("collect")
	.description("Run only the WebSculpt collection step")
	.option("--date <date>", "Date folder (YYYY-MM-DD, default: today)", formatDate(new Date()))
	.option("--concurrency <n>", "Max concurrent calls", parsePositiveInt, 8)
	.option("--delay <ms>", "Delay between same-platform calls (ms)", parseNonNegativeInt, 1500)
	.action(async (options) => {
		const globals = program.optsWithGlobals() as GlobalOptions;
		const logger = createCliLogger(globals);

		const collectOpts: RunCollectDailyOptions = {
			date: options.date,
			concurrency: options.concurrency,
			interCallDelayMs: options.delay,
			skipCollect: false,
			skipNormalize: true,
			logger,
		};

		await runCollectDaily(collectOpts);
	});

// ── build ────────────────────────────────────────────────────────────

program
	.command("build")
	.description("Run the full daily pipeline: collect + normalize + merge")
	.option("--date <date>", "Date folder (YYYY-MM-DD, default: today)", formatDate(new Date()))
	.option("--concurrency <n>", "Max concurrent calls", parsePositiveInt, 8)
	.option("--delay <ms>", "Delay between same-platform calls (ms)", parseNonNegativeInt, 1500)
	.option("--skip-collect", "Skip collection, only normalize and merge", false)
	.option("--skip-normalize", "Skip normalize and merge, only collect", false)
	.action(async (options) => {
		const globals = program.optsWithGlobals() as GlobalOptions;
		const logger = createCliLogger(globals);

		const buildOpts: RunCollectDailyOptions = {
			date: options.date,
			concurrency: options.concurrency,
			interCallDelayMs: options.delay,
			skipCollect: options.skipCollect,
			skipNormalize: options.skipNormalize,
			logger,
		};

		await runCollectDaily(buildOpts);
	});

// ── normalize ────────────────────────────────────────────────────────

program
	.command("normalize")
	.description("Normalize a single raw JSON file")
	.requiredOption("--raw <file>", "Path to raw JSON input file")
	.requiredOption("--out <file>", "Path to normalized output file")
	.action(async (options) => {
		const globals = program.optsWithGlobals() as GlobalOptions;
		const logger = createCliLogger(globals);

		await runNormalize(options.raw, options.out, logger);
	});

// ── normalize-batch ──────────────────────────────────────────────────

program
	.command("normalize-batch")
	.description("Normalize all raw JSON files in a directory")
	.requiredOption("--input-dir <dir>", "Directory containing raw JSON files")
	.requiredOption("--output-dir <dir>", "Directory for normalized output files")
	.action(async (options) => {
		const globals = program.optsWithGlobals() as GlobalOptions;
		const logger = createCliLogger(globals);

		await runNormalizeBatch(options.inputDir, options.outputDir, logger);
	});

// ── merge ────────────────────────────────────────────────────────────

program
	.command("merge")
	.description("Merge normalized outputs into a daily report")
	.requiredOption("--input-dir <dir>", "Directory containing normalized JSON files")
	.requiredOption("--output-dir <dir>", "Directory for daily merged output")
	.action(async (options) => {
		const globals = program.optsWithGlobals() as GlobalOptions;
		const logger = createCliLogger(globals);

		const date = path.basename(options.inputDir);
		await runMerge(options.inputDir, options.outputDir, date, undefined, undefined, logger);
	});

// ── doctor ───────────────────────────────────────────────────────────

program
	.command("doctor")
	.description("Verify the runtime environment")
	.action(async () => {
		const globals = program.optsWithGlobals() as GlobalOptions;
		const useColor = !globals.noColor && !process.env.NO_COLOR;
		const logger = createCliLogger(globals);

		const report = await runDoctor(logger);
		const output = formatDoctorReport(report, useColor);

		// Doctor report is always printed, even in quiet mode
		console.log(output);

		if (!report.allPassed) {
			process.exitCode = 1;
		}
	});

// ── sources ──────────────────────────────────────────────────────────

const sourcesCmd = program.command("sources").description("Collection plan management");

sourcesCmd
	.command("list")
	.description("Display the collection plan as a table")
	.action(() => {
		const globals = program.optsWithGlobals() as GlobalOptions;
		const useColor = !globals.noColor && !process.env.NO_COLOR;

		const table = formatSourcesTable({ useColor });
		console.log(table);
	});

// ── Parse ────────────────────────────────────────────────────────────

program.parse();
