import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runMerge } from "../../src/lib/merge-normalized.js";
import type { NormalizedOutput } from "../../src/types/index.js";

function makeOutput(overrides: Partial<NormalizedOutput> = {}): NormalizedOutput {
	return {
		version: "1.0",
		generated_at: "2026-06-17T10:00:00.000Z",
		command: "replicate/get-trending",
		platform: "replicate",
		language: "en",
		category: "en-ai",
		board_type: "trending",
		response_meta: {
			success: true,
			duration: 100,
			raw_total: 1,
			error: null,
		},
		items: [
			{
				id: "1",
				rank: 1,
				title: "Model A",
				url: "https://example.com/a",
				heat: "1K",
				heat_raw: 1000,
				summary: "First model",
				tags: [],
			},
			{
				id: "2",
				rank: 2,
				title: "Model B",
				url: "https://example.com/b",
				heat: "2K",
				heat_raw: 2000,
				summary: "Second model",
				tags: [],
			},
		],
		...overrides,
	};
}

describe("merge-normalized", () => {
	it("exports runMerge", async () => {
		const mod = await import("../../src/lib/merge-normalized.js");
		expect(mod.runMerge).toBeTypeOf("function");
	});

	it("exports type interfaces", async () => {
		const mod = await import("../../src/lib/merge-normalized.js");
		// Type exports exist (can't test at runtime, but module loads)
		expect(mod).toBeDefined();
	});
});

describe("runMerge collection report item_count", () => {
	let tempDir: string;
	let normalizedDir: string;
	let outputDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(path.join(os.tmpdir(), "anytrend-merge-report-"));
		normalizedDir = path.join(tempDir, "normalized");
		outputDir = path.join(tempDir, "daily");
		mkdirSync(normalizedDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("uses the normalized item count instead of the runner's raw estimate", async () => {
		const outputName = "replicate-get-trending-featured";
		writeFileSync(path.join(normalizedDir, `${outputName}.json`), JSON.stringify(makeOutput()));

		const { report } = await runMerge(normalizedDir, outputDir, "2026-06-17", [
			{
				call: {
					command: "replicate/get-trending",
					angle: "Replicate Featured",
					outputName,
					args: ["--sections", "featured"],
					platform: "replicate",
					requiresBrowser: false,
					requiresLogin: false,
				},
				resolvedArgs: ["--sections", "featured"],
				status: "success",
				durationMs: 1000,
				outputPath: "/tmp/raw.json",
				// The runner estimated only 1 item from the raw websculpt shape,
				// but the normalized file contains 2 items.
				itemCount: 1,
				error: null,
			},
		]);

		expect(report.calls).toHaveLength(1);
		expect(report.calls[0]?.item_count).toBe(2);

		// Also verify the report was persisted with the corrected count.
		const persisted = JSON.parse(
			readFileSync(path.join(outputDir, "collection-report.json"), "utf-8"),
		) as typeof report;
		expect(persisted.calls[0]?.item_count).toBe(2);
	});

	it("falls back to the runner estimate when no normalized output exists", async () => {
		const outputName = "replicate-get-trending-featured";

		const { report } = await runMerge(normalizedDir, outputDir, "2026-06-17", [
			{
				call: {
					command: "replicate/get-trending",
					angle: "Replicate Featured",
					outputName,
					args: ["--sections", "featured"],
					platform: "replicate",
					requiresBrowser: false,
					requiresLogin: false,
				},
				resolvedArgs: ["--sections", "featured"],
				status: "success",
				durationMs: 1000,
				outputPath: "/tmp/raw.json",
				itemCount: 7,
				error: null,
			},
		]);

		expect(report.calls[0]?.item_count).toBe(7);
	});
});

describe("runMerge duplicate handling", () => {
	let tempDir: string;
	let normalizedDir: string;
	let outputDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(path.join(os.tmpdir(), "anytrend-merge-dedup-"));
		normalizedDir = path.join(tempDir, "normalized");
		outputDir = path.join(tempDir, "daily");
		mkdirSync(normalizedDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("deduplicates items by id across normalized files", async () => {
		const sharedItem = {
			id: "qbitai:_:1:shared-title",
			rank: 1,
			title: "Shared title",
			url: "https://example.com/shared",
			heat: null,
			heat_raw: null,
			summary: "A shared article",
			tags: ["ai"],
		};

		writeFileSync(
			path.join(normalizedDir, "qbitai-get-latest.json"),
			JSON.stringify(
				makeOutput({
					command: "qbitai/get-latest",
					platform: "qbitai",
					language: "zh",
					category: "zh-ai",
					board_type: "latest",
					items: [sharedItem],
				}),
			),
		);
		writeFileSync(
			path.join(normalizedDir, "qbitai-get-latest-featured.json"),
			JSON.stringify(
				makeOutput({
					command: "qbitai/get-latest",
					platform: "qbitai",
					language: "zh",
					category: "zh-ai",
					board_type: "latest",
					items: [sharedItem],
				}),
			),
		);

		const { merged, report } = await runMerge(normalizedDir, outputDir, "2026-06-17");

		expect(merged.items).toHaveLength(1);
		expect(merged.meta.total_items).toBe(1);
		expect(merged.meta.duplicate_count).toBe(1);
		expect(report.total_items).toBe(1);
		expect(report.duplicate_count).toBe(1);

		const jsonlLines = readFileSync(path.join(outputDir, "merged.jsonl"), "utf-8")
			.trim()
			.split("\n")
			.filter((line) => line.length > 0);
		expect(jsonlLines).toHaveLength(1);

		const meta = JSON.parse(readFileSync(path.join(outputDir, "meta.json"), "utf-8")) as typeof merged;
		expect(meta.meta.duplicate_count).toBe(1);
		expect(meta.meta.total_items).toBe(1);

		const persistedReport = JSON.parse(
			readFileSync(path.join(outputDir, "collection-report.json"), "utf-8"),
		) as typeof report;
		expect(persistedReport.duplicate_count).toBe(1);
	});
});
