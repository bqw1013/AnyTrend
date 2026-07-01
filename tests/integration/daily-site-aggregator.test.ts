import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runDailySiteAggregate } from "../../src/lib/daily-site-aggregator.js";
import { COLLECT_PLAN } from "../fixtures/daily-site/collect-plan.js";

const FIXTURE_DIR = path.resolve(__dirname, "..", "fixtures", "daily-site");
const SITE_CONFIG_PATH = path.join(FIXTURE_DIR, "site.yaml");

interface AnnotatedItem {
	id: string;
	category_id: string;
	category_reason: string;
	title: string;
	summary: string | null;
	homepage_score: number;
	homepage_reason: string;
	feed_scores: Record<string, { score: number; reason: string }>;
}

function readJsonl(filePath: string): unknown[] {
	const content = readFileSync(filePath, "utf-8");
	return content
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => JSON.parse(line) as unknown);
}

function readJson(filePath: string): unknown {
	return JSON.parse(readFileSync(filePath, "utf-8")) as unknown;
}

function copyFixtures(tempDir: string, date: string): void {
	const archiveDir = path.join(tempDir, date);
	mkdirSync(archiveDir, { recursive: true });
	cpSync(path.join(FIXTURE_DIR, "merged.jsonl"), path.join(archiveDir, "merged.jsonl"));
	cpSync(path.join(FIXTURE_DIR, "annotated.jsonl"), path.join(archiveDir, "annotated.jsonl"));
}

function writeAnnotated(archiveDir: string, items: AnnotatedItem[]): void {
	const content = `${items.map((item) => JSON.stringify(item)).join("\n")}\n`;
	writeFileSync(path.join(archiveDir, "annotated.jsonl"), content, "utf-8");
}

function writeMerged(archiveDir: string, items: unknown[]): void {
	const content = `${items.map((item) => JSON.stringify(item)).join("\n")}\n`;
	writeFileSync(path.join(archiveDir, "merged.jsonl"), content, "utf-8");
}

describe("runDailySiteAggregate", () => {
	let tempDir: string;
	const date = "2026-06-25";

	beforeEach(() => {
		tempDir = mkdtempSync(path.join(os.tmpdir(), "anytrend-daily-site-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("aggregates fixtures into all five output files with correct sort order", async () => {
		copyFixtures(tempDir, date);

		const result = await runDailySiteAggregate({
			dataDir: tempDir,
			date,
			siteConfigPath: SITE_CONFIG_PATH,
			collectPlan: COLLECT_PLAN,
		});

		expect(result.itemsCount).toBe(10);
		expect(result.skippedCount).toBe(0);

		const archiveDir = path.join(tempDir, date);
		const items = readJsonl(path.join(archiveDir, "items.jsonl"));
		expect(items).toHaveLength(10);
		expect(items[0]).toMatchObject({
			id: "baidu:realtime:1:河南高考600分及以上37544人",
			platform: "baidu",
			angle: "百度实时热搜",
			homepage_score: 3,
		});

		const sources = readJson(path.join(archiveDir, "sources.json")) as {
			platforms: Array<{
				platform: string;
				angles: Array<{ angle: string; item_ids: string[] }>;
			}>;
		};
		expect(sources.platforms.map((p) => p.platform)).toEqual(["baidu", "github", "hackernews"]);
		const githubAngles = sources.platforms.find((p) => p.platform === "github")?.angles ?? [];
		expect(githubAngles.map((a) => a.angle)).toEqual(["GitHub Weekly Trending", "GitHub Daily Trending"]);
		expect(sources.platforms[0]?.angles[0]?.item_ids).toEqual([
			"baidu:realtime:1:河南高考600分及以上37544人",
			"baidu:realtime:2:消费品以旧换新",
			"baidu:realtime:3:明星离婚",
			"baidu:realtime:4:地方美食节",
		]);

		const homepage = readJson(path.join(archiveDir, "homepage.json")) as {
			summary: string;
			candidates: Array<{ item_id: string; score: number; order: number }>;
		};
		expect(homepage.summary).toBe("");
		expect(homepage.candidates).toHaveLength(2);
		expect(homepage.candidates.map((c) => c.item_id)).toEqual([
			"github:trending:1:Unlimited OCR",
			"baidu:realtime:2:消费品以旧换新",
		]);
		expect(homepage.candidates.map((c) => c.order)).toEqual([1, 2]);

		const feeds = readJson(path.join(archiveDir, "feeds.json")) as {
			feeds: Array<{ id: string; candidates: Array<{ item_id: string; score: number }> }>;
		};
		expect(feeds.feeds.map((f) => f.id)).toEqual(["ai", "politics-economy"]);
		const aiFeed = feeds.feeds.find((f) => f.id === "ai")?.candidates ?? [];
		expect(aiFeed.map((c) => c.item_id)).toEqual([
			"github:trending:1:Unlimited OCR",
			"github:trending:2:AI Agent框架",
		]);
		const peFeed = feeds.feeds.find((f) => f.id === "politics-economy")?.candidates ?? [];
		expect(peFeed.map((c) => c.item_id)).toEqual([
			"hackernews:top:2:美联储利率决议",
			"baidu:realtime:2:消费品以旧换新",
		]);

		const themes = readJson(path.join(archiveDir, "themes.json")) as {
			categories: Array<{ category_id: string; item_ids: string[] }>;
		};
		expect(themes.categories.map((c) => c.category_id)).toEqual(["ai", "tech", "business", "society", "other"]);
		expect(themes.categories[0]?.item_ids).toEqual([
			"github:trending:1:Unlimited OCR",
			"github:trending:2:AI Agent框架",
		]);
		expect(themes.categories[1]?.item_ids).toEqual([
			"hackernews:top:1:Android 17发布",
			"github:trending:3:新的JS框架",
			"hackernews:top:3:量子计算突破",
		]);
	});

	it("reports validation errors for missing field, invalid category, invalid score, and missing feed", async () => {
		copyFixtures(tempDir, date);
		const archiveDir = path.join(tempDir, date);
		const baseItems = readJsonl(path.join(archiveDir, "annotated.jsonl")) as AnnotatedItem[];

		const invalidItems: AnnotatedItem[] = [
			{ ...baseItems[0], homepage_score: undefined as unknown as number },
			{ ...baseItems[1], category_id: "invalid-category" },
			{ ...baseItems[2], feed_scores: { ...baseItems[2].feed_scores, ai: { score: 6, reason: "score too high" } } },
			{ ...baseItems[3], feed_scores: { ai: { score: 3, reason: "missing politics-economy" } } },
		];
		writeAnnotated(archiveDir, invalidItems);

		await expect(
			runDailySiteAggregate({
				dataDir: tempDir,
				date,
				siteConfigPath: SITE_CONFIG_PATH,
				collectPlan: COLLECT_PLAN,
			}),
		).rejects.toThrow(/annotated\.jsonl validation failed/);

		// No partial output files should be written.
		for (const file of ["items.jsonl", "sources.json", "homepage.json", "feeds.json", "themes.json"]) {
			expect(() => readFileSync(path.join(archiveDir, file), "utf-8")).toThrow();
		}
	});

	it("produces output with --skip-validation despite invalid input", async () => {
		copyFixtures(tempDir, date);
		const archiveDir = path.join(tempDir, date);
		const baseItems = readJsonl(path.join(archiveDir, "annotated.jsonl")) as AnnotatedItem[];

		// Invalid category and out-of-range feed score should normally fail validation.
		const invalidItems: AnnotatedItem[] = baseItems.map((item, index) =>
			index === 0 ? { ...item, category_id: "invalid-category" } : item,
		);
		invalidItems[1] = {
			...invalidItems[1],
			feed_scores: { ...invalidItems[1].feed_scores, ai: { score: 6, reason: "too high" } },
		};
		writeAnnotated(archiveDir, invalidItems);

		const result = await runDailySiteAggregate({
			dataDir: tempDir,
			date,
			skipValidation: true,
			siteConfigPath: SITE_CONFIG_PATH,
			collectPlan: COLLECT_PLAN,
		});

		expect(result.itemsCount).toBe(10);

		const homepage = readJson(path.join(archiveDir, "homepage.json")) as { candidates: unknown[] };
		expect(homepage.candidates.length).toBeGreaterThan(0);
	});

	it("skips annotated rows with no matching merged row and reports the count", async () => {
		copyFixtures(tempDir, date);
		const archiveDir = path.join(tempDir, date);
		const baseItems = readJsonl(path.join(archiveDir, "annotated.jsonl")) as AnnotatedItem[];
		baseItems.push({
			id: "missing:merged:1:不存在",
			category_id: "other",
			category_reason: "测试跳过",
			title: "不存在于 merged",
			summary: null,
			homepage_score: 1,
			homepage_reason: "测试",
			feed_scores: {
				ai: { score: 1, reason: "测试" },
				"politics-economy": { score: 1, reason: "测试" },
			},
		});
		writeAnnotated(archiveDir, baseItems);

		const result = await runDailySiteAggregate({
			dataDir: tempDir,
			date,
			siteConfigPath: SITE_CONFIG_PATH,
			collectPlan: COLLECT_PLAN,
		});

		expect(result.itemsCount).toBe(10);
		expect(result.skippedCount).toBe(1);
	});

	it("reports duplicate id values as validation errors", async () => {
		copyFixtures(tempDir, date);
		const archiveDir = path.join(tempDir, date);
		const baseItems = readJsonl(path.join(archiveDir, "annotated.jsonl")) as AnnotatedItem[];
		const duplicateId = baseItems[0]?.id ?? "duplicate:id";
		const secondItem = baseItems[1];
		expect(secondItem).toBeDefined();
		baseItems[1] = { ...secondItem, id: duplicateId };
		writeAnnotated(archiveDir, baseItems);

		await expect(
			runDailySiteAggregate({
				dataDir: tempDir,
				date,
				siteConfigPath: SITE_CONFIG_PATH,
				collectPlan: COLLECT_PLAN,
			}),
		).rejects.toThrow(/annotated\.jsonl validation failed/);

		await expect(
			runDailySiteAggregate({
				dataDir: tempDir,
				date,
				siteConfigPath: SITE_CONFIG_PATH,
				collectPlan: COLLECT_PLAN,
			}),
		).rejects.toThrow(new RegExp(`Duplicate id "${duplicateId}"`));
	});

	it("warns when annotated and merged row counts differ by more than 20%", async () => {
		copyFixtures(tempDir, date);
		const archiveDir = path.join(tempDir, date);
		const baseMerged = readJsonl(path.join(archiveDir, "merged.jsonl"));
		// Drop 25% of merged rows so the difference exceeds the 20% threshold.
		writeMerged(archiveDir, baseMerged.slice(0, -3));

		const warnings: string[] = [];
		const logger = {
			log: () => {},
			error: () => {},
			warn: (message: string) => warnings.push(message),
			info: () => {},
		};

		await runDailySiteAggregate({
			dataDir: tempDir,
			date,
			siteConfigPath: SITE_CONFIG_PATH,
			collectPlan: COLLECT_PLAN,
			logger,
		});

		expect(warnings.some((message) => /Row count mismatch/.test(message))).toBe(true);
	});
});
