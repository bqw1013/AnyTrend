#!/usr/bin/env node
/**
 * Single-file normalize script.
 *
 * Usage:
 *   npx tsx src/scripts/normalize.ts \
 *     --input data/raw/2026-06-15/baidu.json \
 *     --output data/normalized/2026-06-15/baidu.json
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

function parseArgs(): { input: string; output: string } {
	const args = process.argv.slice(2);
	const inputFlag = args.indexOf("--input") !== -1 ? args.indexOf("--input") : args.indexOf("-i");
	const outputFlag = args.indexOf("--output") !== -1 ? args.indexOf("--output") : args.indexOf("-o");

	const input = args[inputFlag + 1];
	const output = args[outputFlag + 1];

	if (!input || !output) {
		console.error("Usage: --input <file> --output <file>");
		process.exit(1);
	}

	return { input, output };
}

async function normalizeFile(inputPath: string, outputPath: string): Promise<void> {
	const raw = JSON.parse(readFileSync(inputPath, "utf-8")) as {
		command?: string;
	} & Record<string, unknown>;

	const command = raw.command;
	if (!command) {
		throw new Error(`No 'command' field found in ${inputPath}`);
	}

	const adapter = await getAdapter(command);
	const adapterOutput = adapter.normalize(raw);

	const parsed = adapterOutputSchema.safeParse(adapterOutput);
	if (!parsed.success) {
		throw new Error(
			`Adapter output for ${command} from ${inputPath} does not match schema:\n${parsed.error.message}`,
		);
	}

	const result: NormalizedOutput = {
		version: VERSION,
		generated_at: nowIso(),
		...adapterOutput,
	};

	mkdirSync(path.dirname(outputPath), { recursive: true });
	writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
	console.log(`Normalized: ${inputPath} -> ${outputPath}`);
}

async function main(): Promise<void> {
	const { input, output } = parseArgs();
	await normalizeFile(input, output);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
