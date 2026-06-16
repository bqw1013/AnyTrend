#!/usr/bin/env node
/**
 * Batch normalize script.
 *
 * Usage:
 *   npx tsx src/scripts/normalize-batch.ts \
 *     --raw-dir data/raw/2026-06-15 \
 *     --out-dir data/normalized/2026-06-15
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getAdapter } from "../adapters/index.js";
import { nowIso } from "../adapters/utils.js";
import type { NormalizedOutput } from "../types/index.js";
import { adapterOutputSchema } from "../types/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(readFileSync(path.join(__dirname, "..", "..", "package.json"), "utf-8")) as {
	version: string;
};
const VERSION = pkg.version;

function parseArgs(): { rawDir: string; outDir: string } {
	const args = process.argv.slice(2);
	const rawFlag = args.indexOf("--raw-dir") !== -1 ? args.indexOf("--raw-dir") : args.indexOf("-i");
	const outFlag = args.indexOf("--out-dir") !== -1 ? args.indexOf("--out-dir") : args.indexOf("-o");

	const rawDir = args[rawFlag + 1];
	const outDir = args[outFlag + 1];

	if (!rawDir || !outDir) {
		console.error("Usage: --raw-dir <dir> --out-dir <dir>");
		process.exit(1);
	}

	return { rawDir, outDir };
}

export async function normalizeBatch(rawDir: string, outDir: string): Promise<void> {
	mkdirSync(outDir, { recursive: true });

	const files = readdirSync(rawDir)
		.filter((f) => f.endsWith(".json") && !f.endsWith(".args.json") && !f.endsWith(".meta.json"))
		.sort();

	if (files.length === 0) {
		console.log(`No JSON files found in ${rawDir}`);
		return;
	}

	let successCount = 0;
	let failCount = 0;

	for (const file of files) {
		const inputPath = path.join(rawDir, file);
		const outputPath = path.join(outDir, file);

		try {
			const raw = JSON.parse(readFileSync(inputPath, "utf-8")) as {
				command?: string;
			} & Record<string, unknown>;

			const command = raw.command;
			if (!command) {
				console.log(`SKIP: ${file} (no command field)`);
				failCount++;
				continue;
			}

			const adapter = await getAdapter(command);
			const adapterOutput = adapter.normalize(raw);

			const parsed = adapterOutputSchema.safeParse(adapterOutput);
			if (!parsed.success) {
				throw new Error(`Adapter output for ${command} does not match schema: ${parsed.error.message}`);
			}

			const result: NormalizedOutput = {
				version: VERSION,
				generated_at: nowIso(),
				...adapterOutput,
			};

			writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
			console.log(`OK:   ${file}`);
			successCount++;
		} catch (err) {
			console.error(`FAIL: ${file} - ${err instanceof Error ? err.message : String(err)}`);
			if (err instanceof Error && err.stack) {
				console.error(err.stack);
			}
			failCount++;
		}
	}

	console.log(`\nDone. Success: ${successCount}, Failed: ${failCount}`);
}

async function main(): Promise<void> {
	const { rawDir, outDir } = parseArgs();
	await normalizeBatch(rawDir, outDir);
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
