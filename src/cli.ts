#!/usr/bin/env node
/**
 * AnyTrend CLI entry point.
 *
 * Provides subcommands for collection, normalization, merging,
 * environment diagnostics, and collection plan listing.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import type { RunCollectDailyOptions } from "./lib/collect-daily.js";
import { runCollectDaily } from "./lib/collect-daily.js";
import { runDailySiteAggregate } from "./lib/daily-site-aggregator.js";
import { loadDailySiteData, renderSite } from "./lib/daily-site-renderer.js";
import { formatDoctorReport, runDoctor } from "./lib/doctor.js";
import type { Logger } from "./lib/logger.js";
import { createLogger } from "./lib/logger.js";
import { runMerge } from "./lib/merge-normalized.js";
import { runNormalize, runNormalizeBatch } from "./lib/normalize.js";
import { runSetup } from "./lib/setup.js";
import { formatSourcesTable } from "./lib/sources.js";

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
	.option("--archive-date <date>", "Archive folder date (YYYY-MM-DD, default: today)", formatDate(new Date()))
	.option("--concurrency <n>", "Max concurrent calls", parsePositiveInt, 8)
	.option("--delay <ms>", "Delay between same-platform calls (ms)", parseNonNegativeInt, 1500)
	.action(async (options) => {
		const globals = program.optsWithGlobals() as GlobalOptions;
		const logger = createCliLogger(globals);

		const collectOpts: RunCollectDailyOptions = {
			date: options.archiveDate,
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
	.option("--archive-date <date>", "Archive folder date (YYYY-MM-DD, default: today)", formatDate(new Date()))
	.option("--concurrency <n>", "Max concurrent calls", parsePositiveInt, 8)
	.option("--delay <ms>", "Delay between same-platform calls (ms)", parseNonNegativeInt, 1500)
	.option("--skip-collect", "Skip collection, only normalize and merge", false)
	.option("--skip-normalize", "Skip normalize and merge, only collect", false)
	.action(async (options) => {
		const globals = program.optsWithGlobals() as GlobalOptions;
		const logger = createCliLogger(globals);

		const buildOpts: RunCollectDailyOptions = {
			date: options.archiveDate,
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
	.requiredOption("--input <file>", "Path to raw JSON input file")
	.requiredOption("--output <file>", "Path to normalized output file")
	.action(async (options) => {
		const globals = program.optsWithGlobals() as GlobalOptions;
		const logger = createCliLogger(globals);

		await runNormalize(options.input, options.output, logger);
	});

// ── normalize-batch ──────────────────────────────────────────────────

program
	.command("normalize-batch")
	.description("Normalize all raw JSON files in a directory")
	.requiredOption("--input <dir>", "Directory containing raw JSON files")
	.requiredOption("--output <dir>", "Directory for normalized output files")
	.action(async (options) => {
		const globals = program.optsWithGlobals() as GlobalOptions;
		const logger = createCliLogger(globals);

		// Validate --input is a directory
		if (!existsSync(options.input)) {
			logger.error(`Input path does not exist: ${options.input}`);
			process.exit(1);
		}
		if (!statSync(options.input).isDirectory()) {
			logger.error(`Input must be a directory: ${options.input}`);
			process.exit(1);
		}

		// Validate --output is a directory or does not exist
		if (existsSync(options.output)) {
			if (!statSync(options.output).isDirectory()) {
				logger.error(`Output must be a directory: ${options.output}`);
				process.exit(1);
			}
		}

		const result = await runNormalizeBatch(options.input, options.output, logger);

		// Exit code 1 when files were found but all failed
		if (result.fileCount > 0 && result.successCount === 0) {
			process.exit(1);
		}
	});

// ── merge ────────────────────────────────────────────────────────────

program
	.command("merge")
	.description("Merge normalized outputs into a daily report")
	.requiredOption("--input <dir>", "Directory containing normalized JSON files")
	.requiredOption("--output <dir>", "Directory for daily merged output")
	.action(async (options) => {
		const globals = program.optsWithGlobals() as GlobalOptions;
		const logger = createCliLogger(globals);

		// Validate --input is a directory
		if (!existsSync(options.input)) {
			logger.error(`Input path does not exist: ${options.input}`);
			process.exit(1);
		}
		if (!statSync(options.input).isDirectory()) {
			logger.error(`Input must be a directory: ${options.input}`);
			process.exit(1);
		}

		// Validate --output is a directory or does not exist
		if (existsSync(options.output)) {
			if (!statSync(options.output).isDirectory()) {
				logger.error(`Output must be a directory: ${options.output}`);
				process.exit(1);
			}
		}

		const date = path.basename(options.input);
		await runMerge(options.input, options.output, date, undefined, undefined, logger);
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

// ── setup ────────────────────────────────────────────────────────────

program
	.command("setup")
	.description("Import bundled WebSculpt commands into your local command library")
	.option("--dry-run", "Print the import command without executing it", false)
	.action(async (options) => {
		const globals = program.optsWithGlobals() as GlobalOptions;
		const logger = createCliLogger(globals);

		const result = await runSetup({ dryRun: options.dryRun, logger });
		if (!result.success) {
			process.exit(1);
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

// ── daily-site ───────────────────────────────────────────────────────

const dailySiteCmd = program.command("daily-site").description("Daily Site intermediate file generation");

dailySiteCmd
	.command("aggregate")
	.description("Aggregate merged.jsonl and annotated.jsonl into Daily Site files")
	.option("--archive-date <date>", "Archive folder date (YYYY-MM-DD, default: today)", formatDate(new Date()))
	.option("--skip-validation", "Skip annotated.jsonl validation", false)
	.action(async (options) => {
		const globals = program.optsWithGlobals() as GlobalOptions;
		const logger = createCliLogger(globals);

		await runDailySiteAggregate({
			date: options.archiveDate,
			skipValidation: options.skipValidation,
			logger,
		});
	});

dailySiteCmd
	.command("render")
	.description("Render Daily Site intermediate files into static HTML")
	.option("--archive-date <date>", "Archive folder date (YYYY-MM-DD, default: today)", formatDate(new Date()))
	.option("--output <dir>", "Output directory root (default: anytrend-data/site)", "anytrend-data/site")
	.action(async (options) => {
		const globals = program.optsWithGlobals() as GlobalOptions;
		const logger = createCliLogger(globals);
		const date = options.archiveDate;
		const outputRoot = options.output;

		const dateDir = path.resolve("anytrend-data", "daily", date);
		const outputDir = path.resolve(outputRoot, date);
		const siteConfigPath = path.resolve("config", "site.yaml");

		try {
			const input = await loadDailySiteData(dateDir, siteConfigPath);
			await renderSite(input, outputDir, { quiet: globals.quiet, logger });
			if (!globals.quiet) {
				logger.info(`Daily site render complete for ${date}: ${outputDir}`);
			}
		} catch (err) {
			logger.error(`Daily site render failed for ${date}: ${err instanceof Error ? err.message : String(err)}`);
			process.exit(1);
		}
	});

// ── Parse ────────────────────────────────────────────────────────────

program.parse();
