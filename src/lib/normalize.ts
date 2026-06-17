/**
 * Normalize runner functions — single-file and batch.
 *
 * Used by the CLI (src/cli.ts). Not a standalone script.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getAdapter } from "../adapters/index.js";
import { nowIso } from "../adapters/utils.js";
import type { Logger } from "../lib/logger.js";
import { defaultLogger } from "../lib/logger.js";
import type { NormalizedOutput } from "../types/index.js";
import { adapterOutputSchema } from "../types/schema.js";

const VERSION = (
	JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf-8")) as { version: string }
).version;

export async function runNormalize(rawPath: string, outPath: string, logger?: Logger): Promise<void> {
	const log = logger ?? defaultLogger;

	const raw = JSON.parse(readFileSync(rawPath, "utf-8")) as {
		command?: string;
	} & Record<string, unknown>;

	const command = raw.command;
	if (!command) {
		throw new Error(`No 'command' field found in ${rawPath}`);
	}

	const adapter = await getAdapter(command);
	const adapterOutput = adapter.normalize(raw);

	const parsed = adapterOutputSchema.safeParse(adapterOutput);
	if (!parsed.success) {
		throw new Error(`Adapter output for ${command} from ${rawPath} does not match schema:\n${parsed.error.message}`);
	}

	const result: NormalizedOutput = {
		version: VERSION,
		generated_at: nowIso(),
		...adapterOutput,
	};

	mkdirSync(path.dirname(outPath), { recursive: true });
	writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
	log.log(`Normalized: ${rawPath} -> ${outPath}`);
}

export interface NormalizeBatchResult {
	successCount: number;
	failCount: number;
	fileCount: number;
}

export async function runNormalizeBatch(
	rawDir: string,
	outDir: string,
	logger?: Logger,
): Promise<NormalizeBatchResult> {
	const log = logger ?? defaultLogger;

	mkdirSync(outDir, { recursive: true });

	const files = readdirSync(rawDir)
		.filter((f) => f.endsWith(".json") && !f.endsWith(".args.json") && !f.endsWith(".meta.json"))
		.sort();

	if (files.length === 0) {
		log.log(`No JSON files found in ${rawDir}`);
		return { successCount: 0, failCount: 0, fileCount: 0 };
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
				log.log(`SKIP: ${file} (no command field)`);
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
			log.log(`OK:   ${file}`);
			successCount++;
		} catch (err) {
			log.error(`FAIL: ${file} - ${err instanceof Error ? err.message : String(err)}`);
			if (err instanceof Error && err.stack) {
				log.error(err.stack);
			}
			failCount++;
		}
	}

	log.log(`\nDone. Success: ${successCount}, Failed: ${failCount}`);
	return { successCount, failCount, fileCount: files.length };
}
