import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runMerge } from "../../src/lib/merge-normalized.js";
import type { NormalizedOutput } from "../../src/types/index.js";

function makeOutput(overrides: Partial<NormalizedOutput> = {}): NormalizedOutput {
	return {
		version: "1.0",
		generated_at: "2026-06-17T10:00:00.000Z",
		command: "baidu/get-hot",
		platform: "baidu",
		language: "zh",
		category: "zh-general",
		board_type: "hot-search",
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
				title: "Trending topic",
				url: "https://example.com/trend",
				heat: "1.0M",
				heat_raw: 1_000_000,
				summary: "A trending topic",
				tags: ["hot"],
			},
		],
		...overrides,
	};
}

describe("runMerge digest output", () => {
	let tempDir: string;
	let normalizedDir: string;
	let outputDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(path.join(os.tmpdir(), "anytrend-merge-digest-"));
		normalizedDir = path.join(tempDir, "normalized");
		outputDir = path.join(tempDir, "daily");
		mkdirSync(normalizedDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("creates a digest file for each successful normalized output", async () => {
		writeFileSync(
			path.join(normalizedDir, "baidu-get-hot-realtime.json"),
			JSON.stringify(makeOutput({ command: "baidu/get-hot" })),
		);
		writeFileSync(
			path.join(normalizedDir, "github-get-trending-weekly.json"),
			JSON.stringify(
				makeOutput({
					command: "github/get-trending",
					platform: "github",
					language: "en",
					category: "en-general",
					board_type: "trending",
				}),
			),
		);

		await runMerge(normalizedDir, outputDir, "2026-06-17");

		const digestDir = path.join(outputDir, "digest");
		const files = readdirSync(digestDir).sort();
		expect(files).toEqual(["baidu-get-hot-realtime.md", "github-get-trending-weekly.md"]);

		const baiduDigest = readFileSync(path.join(digestDir, "baidu-get-hot-realtime.md"), "utf-8");
		expect(baiduDigest).toContain("# baidu/get-hot");
		expect(baiduDigest).toContain("1. **Trending topic**");

		const githubDigest = readFileSync(path.join(digestDir, "github-get-trending-weekly.md"), "utf-8");
		expect(githubDigest).toContain("# github/get-trending");
	});

	it("skips digest files for failed normalized outputs", async () => {
		writeFileSync(
			path.join(normalizedDir, "baidu-get-hot-realtime.json"),
			JSON.stringify(makeOutput({ command: "baidu/get-hot" })),
		);
		writeFileSync(
			path.join(normalizedDir, "failed-source.json"),
			JSON.stringify(
				makeOutput({
					command: "failed/command",
					response_meta: {
						success: false,
						duration: null,
						raw_total: null,
						error: { code: "ERR", message: "failure" },
					},
					items: [],
				}),
			),
		);

		await runMerge(normalizedDir, outputDir, "2026-06-17");

		const digestDir = path.join(outputDir, "digest");
		const files = readdirSync(digestDir).sort();
		expect(files).toEqual(["baidu-get-hot-realtime.md"]);
	});

	it("still writes daily-merged.json and collection-report.json", async () => {
		writeFileSync(
			path.join(normalizedDir, "baidu-get-hot-realtime.json"),
			JSON.stringify(makeOutput({ command: "baidu/get-hot" })),
		);

		await runMerge(normalizedDir, outputDir, "2026-06-17");

		expect(readdirSync(outputDir).sort()).toContain("daily-merged.json");
		expect(readdirSync(outputDir).sort()).toContain("collection-report.json");
	});
});
