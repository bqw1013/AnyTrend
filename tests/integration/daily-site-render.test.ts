import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadDailySiteData, renderSite } from "../../src/lib/daily-site-renderer.js";

const FIXTURE_DIR = path.resolve(__dirname, "..", "fixtures", "daily-site-render");
const SITE_CONFIG_PATH = path.resolve(__dirname, "..", "..", "config", "site.yaml");

describe("daily-site renderer", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(path.join(os.tmpdir(), "anytrend-daily-site-render-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("renders all four HTML pages and copies assets", async () => {
		const input = await loadDailySiteData(FIXTURE_DIR, SITE_CONFIG_PATH);
		await renderSite(input, tempDir);

		for (const file of ["index.html", "themes.html", "sources.html", "feeds.html"]) {
			expect(existsSync(path.join(tempDir, file))).toBe(true);
		}
		expect(existsSync(path.join(tempDir, "assets", "style.css"))).toBe(true);
		expect(existsSync(path.join(tempDir, "assets", "site.js"))).toBe(true);
	});

	it("renders homepage summary and candidates", async () => {
		const input = await loadDailySiteData(FIXTURE_DIR, SITE_CONFIG_PATH);
		await renderSite(input, tempDir);

		const indexHtml = readFileSync(path.join(tempDir, "index.html"), "utf-8");
		expect(indexHtml).toContain("Test summary for the homepage.");
		expect(indexHtml).toContain("Normal item");
		expect(indexHtml).toContain("A normal item.");
		expect(indexHtml).toContain("100万");
	});

	it("renders themes with categories and items", async () => {
		const input = await loadDailySiteData(FIXTURE_DIR, SITE_CONFIG_PATH);
		await renderSite(input, tempDir);

		const themesHtml = readFileSync(path.join(tempDir, "themes.html"), "utf-8");
		expect(themesHtml).toContain('id="ai"');
		expect(themesHtml).toContain('id="tech"');
		expect(themesHtml).toContain('id="business"');
		expect(themesHtml).toContain('id="society"');
		expect(themesHtml).toContain('id="other"');
		expect(themesHtml).toContain("Normal item");
		expect(themesHtml).toContain("Tech item");
		expect(themesHtml).toContain("Business item");
		expect(themesHtml).toContain("AI reason");
	});

	it("renders sources with platforms, angles and rank ordering", async () => {
		const input = await loadDailySiteData(FIXTURE_DIR, SITE_CONFIG_PATH);
		await renderSite(input, tempDir);

		const sourcesHtml = readFileSync(path.join(tempDir, "sources.html"), "utf-8");
		expect(sourcesHtml).toContain('id="baidu"');
		expect(sourcesHtml).toContain('id="weibo"');
		expect(sourcesHtml).toContain('id="github"');
		expect(sourcesHtml).toContain("实时");
		expect(sourcesHtml).toContain("热搜");
		expect(sourcesHtml).toContain("trending");
		expect(sourcesHtml).toContain("Normal item");
		expect(sourcesHtml).toContain("Tech item");
	});

	it("renders feeds with titles and candidates", async () => {
		const input = await loadDailySiteData(FIXTURE_DIR, SITE_CONFIG_PATH);
		await renderSite(input, tempDir);

		const feedsHtml = readFileSync(path.join(tempDir, "feeds.html"), "utf-8");
		expect(feedsHtml).toContain('id="ai"');
		expect(feedsHtml).toContain('id="politics-economy"');
		expect(feedsHtml).toContain("AI 动态");
		expect(feedsHtml).toContain("政经观察");
		expect(feedsHtml).toContain("Normal item");
		expect(feedsHtml).toContain("Business item");
		expect(feedsHtml).toContain("Core AI.");
		expect(feedsHtml).toContain("Core PE.");
	});

	it("escapes HTML special characters in titles", async () => {
		const input = await loadDailySiteData(FIXTURE_DIR, SITE_CONFIG_PATH);
		await renderSite(input, tempDir);

		const themesHtml = readFileSync(path.join(tempDir, "themes.html"), "utf-8");
		expect(themesHtml).toContain("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
		expect(themesHtml).not.toContain("<script>alert('xss')</script>");
	});

	it("renders items without a URL as plain text", async () => {
		const input = await loadDailySiteData(FIXTURE_DIR, SITE_CONFIG_PATH);
		await renderSite(input, tempDir);

		const themesHtml = readFileSync(path.join(tempDir, "themes.html"), "utf-8");
		const otherSection = themesHtml.slice(themesHtml.indexOf('id="other"'));
		expect(otherSection).toContain("No URL item");
		expect(otherSection).not.toMatch(/<a[^>]*>No URL item<\/a>/);
	});

	it("throws a descriptive error when a required file is missing", async () => {
		const missingFileDir = mkdtempSync(path.join(os.tmpdir(), "anytrend-daily-site-missing-"));
		try {
			await expect(loadDailySiteData(missingFileDir, SITE_CONFIG_PATH)).rejects.toThrow(
				/Missing required Daily Site file/,
			);
		} finally {
			rmSync(missingFileDir, { recursive: true, force: true });
		}
	});
});
