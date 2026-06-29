/**
 * Daily Site static renderer.
 *
 * Loads intermediate data files for a single archive date and renders four
 * static HTML pages using EJS templates.
 */

import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ejs from "ejs";
import { load as loadYaml } from "js-yaml";
import type { z } from "zod";
import {
	type AggregatedItem,
	aggregatedItemSchema,
	feedsOutputSchema,
	homepageOutputSchema,
	type SiteConfig,
	siteConfigSchema,
	sourcesOutputSchema,
	themesOutputSchema,
} from "../types/daily-site.js";
import {
	type DailySiteRenderInput,
	type DailySiteRenderOptions,
	dailySiteMetaSchema,
} from "../types/daily-site-render.js";
import { defaultLogger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.resolve(__dirname, "..", "site-template");
const layoutPath = path.join(templateDir, "layouts", "main.ejs");

const pageDefinitions: Array<{
	name: "index" | "themes" | "sources" | "feeds";
	template: string;
	title: (date: string) => string;
}> = [
	{
		name: "index",
		template: "pages/index.ejs",
		title: (date) => `AnyTrend 热点日报 - ${date}`,
	},
	{
		name: "themes",
		template: "pages/themes.ejs",
		title: (date) => `分类浏览 - AnyTrend 热点日报 ${date}`,
	},
	{
		name: "sources",
		template: "pages/sources.ejs",
		title: (date) => `来源浏览 - AnyTrend 热点日报 ${date}`,
	},
	{
		name: "feeds",
		template: "pages/feeds.ejs",
		title: (date) => `AI 精选 - AnyTrend 热点日报 ${date}`,
	},
];

/**
 * Escape a string for safe HTML output.
 *
 * @param value The value to escape. Non-strings are coerced to strings.
 * @returns The HTML-escaped string.
 */
export function escapeHtml(value: unknown): string {
	const text = value === null || value === undefined ? "" : String(value);
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * Parse `config/site.yaml` and return a typed site configuration.
 *
 * This mirrors `loadSiteConfig` from the aggregator but is re-exported here so
 * callers of the renderer do not need to import from the aggregator module.
 *
 * @param configPath Path to the YAML file.
 * @throws When the file cannot be read or does not match the expected schema.
 */
export async function loadSiteConfigForRenderer(configPath: string): Promise<SiteConfig> {
	const raw = await readFile(configPath, "utf-8");
	const parsed = loadYaml(raw) as unknown;
	const result = siteConfigSchema.safeParse(parsed);
	if (!result.success) {
		throw new Error(`Invalid site config ${configPath}: ${result.error.message}`);
	}
	return result.data;
}

function parseJsonl<T>(filePath: string, content: string, parser: (raw: unknown, lineNumber: number) => T): T[] {
	const lines = content.split(/\r?\n/);
	const result: T[] = [];

	for (const [index, line] of lines.entries()) {
		const trimmed = line.trim();
		if (trimmed === "") continue;

		let parsed: unknown;
		try {
			parsed = JSON.parse(trimmed) as unknown;
		} catch (err) {
			throw new Error(
				`Invalid JSON at line ${index + 1} in ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
			);
		}

		result.push(parser(parsed, index + 1));
	}

	return result;
}

function formatZodError(error: z.ZodError<unknown>): string {
	return error.issues.map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`).join("; ");
}

/**
 * Load all intermediate Daily Site data files for a single archive date.
 *
 * @param dateDir Directory containing the daily archive files.
 * @param siteConfigPath Path to `config/site.yaml`.
 * @returns Fully typed input for `renderSite`.
 * @throws When a required file is missing or contains invalid data.
 */
export async function loadDailySiteData(dateDir: string, siteConfigPath: string): Promise<DailySiteRenderInput> {
	const requiredFiles = [
		{ name: "items.jsonl", path: path.join(dateDir, "items.jsonl") },
		{ name: "sources.json", path: path.join(dateDir, "sources.json") },
		{ name: "homepage.json", path: path.join(dateDir, "homepage.json") },
		{ name: "feeds.json", path: path.join(dateDir, "feeds.json") },
		{ name: "themes.json", path: path.join(dateDir, "themes.json") },
		{ name: "meta.json", path: path.join(dateDir, "meta.json") },
	] as const;

	for (const { name, path: filePath } of requiredFiles) {
		try {
			await stat(filePath);
		} catch {
			throw new Error(`Missing required Daily Site file: ${name} at ${filePath}`);
		}
	}

	const [siteConfig, itemsContent, sourcesContent, homepageContent, feedsContent, themesContent, metaContent] =
		await Promise.all([
			loadSiteConfigForRenderer(siteConfigPath),
			readFile(requiredFiles[0].path, "utf-8"),
			readFile(requiredFiles[1].path, "utf-8"),
			readFile(requiredFiles[2].path, "utf-8"),
			readFile(requiredFiles[3].path, "utf-8"),
			readFile(requiredFiles[4].path, "utf-8"),
			readFile(requiredFiles[5].path, "utf-8"),
		]);

	const items = parseJsonl<AggregatedItem>(requiredFiles[0].path, itemsContent, (raw, lineNumber) => {
		const result = aggregatedItemSchema.safeParse(raw);
		if (!result.success) {
			throw new Error(
				`Invalid item at line ${lineNumber} in ${requiredFiles[0].path}: ${formatZodError(result.error)}`,
			);
		}
		return result.data;
	});

	const itemsMap = new Map(items.map((item) => [item.id, item]));

	const metaResult = dailySiteMetaSchema.safeParse(JSON.parse(metaContent) as unknown);
	if (!metaResult.success) {
		throw new Error(`Invalid meta.json: ${formatZodError(metaResult.error)}`);
	}

	const sourcesResult = sourcesOutputSchema.safeParse(JSON.parse(sourcesContent) as unknown);
	if (!sourcesResult.success) {
		throw new Error(`Invalid sources.json: ${formatZodError(sourcesResult.error)}`);
	}

	const homepageResult = homepageOutputSchema.safeParse(JSON.parse(homepageContent) as unknown);
	if (!homepageResult.success) {
		throw new Error(`Invalid homepage.json: ${formatZodError(homepageResult.error)}`);
	}

	const feedsResult = feedsOutputSchema.safeParse(JSON.parse(feedsContent) as unknown);
	if (!feedsResult.success) {
		throw new Error(`Invalid feeds.json: ${formatZodError(feedsResult.error)}`);
	}

	const themesResult = themesOutputSchema.safeParse(JSON.parse(themesContent) as unknown);
	if (!themesResult.success) {
		throw new Error(`Invalid themes.json: ${formatZodError(themesResult.error)}`);
	}

	return {
		date: metaResult.data.date,
		meta: metaResult.data,
		siteConfig,
		items: itemsMap,
		homepage: homepageResult.data,
		sources: sourcesResult.data,
		feeds: feedsResult.data,
		themes: themesResult.data,
	};
}

function buildSections(
	pageName: "index" | "themes" | "sources" | "feeds",
	input: DailySiteRenderInput,
): Array<{ id: string; label: string }> | undefined {
	switch (pageName) {
		case "themes":
			return input.themes.categories.map((category) => ({ id: category.category_id, label: category.name }));
		case "sources":
			return input.sources.platforms.map((platform) => ({ id: platform.platform, label: platform.platform }));
		case "feeds":
			return input.feeds.feeds.map((feed) => ({ id: feed.id, label: feed.title }));
		default:
			return undefined;
	}
}

/**
 * Render all Daily Site pages and copy shared assets to the output directory.
 *
 * @param input Loaded daily site data.
 * @param outputDir Directory where the generated site will be written.
 * @param options Render options.
 * @throws When rendering or writing files fails.
 */
export async function renderSite(
	input: DailySiteRenderInput,
	outputDir: string,
	options: DailySiteRenderOptions = {},
): Promise<void> {
	const quiet = options.quiet ?? false;
	const logger = options.logger ?? defaultLogger;

	await mkdir(outputDir, { recursive: true });

	for (const page of pageDefinitions) {
		const pageTemplatePath = path.join(templateDir, page.template);
		const pageHtml = await ejs.renderFile(
			pageTemplatePath,
			{
				...input,
				currentPage: page.name,
				date: input.date,
			},
			{ filename: pageTemplatePath },
		);

		const sections = buildSections(page.name, input);
		const fullHtml = await ejs.renderFile(
			layoutPath,
			{
				body: pageHtml,
				title: page.title(input.date),
				currentPage: page.name,
				date: input.date,
				sections,
				sidebarTitle: "导航",
				expandLabel: "展开",
				collapseLabel: "收起",
			},
			{ filename: layoutPath },
		);

		const outputFileName = page.name === "index" ? "index.html" : `${page.name}.html`;
		const outputFilePath = path.join(outputDir, outputFileName);
		await writeFile(outputFilePath, fullHtml, "utf-8");
		if (!quiet) {
			logger.info(`Generated ${outputFilePath}`);
		}
	}

	const assetsSourceDir = path.join(templateDir, "assets");
	const assetsOutputDir = path.join(outputDir, "assets");
	await cp(assetsSourceDir, assetsOutputDir, { recursive: true, force: true });
	if (!quiet) {
		logger.info(`Copied assets to ${assetsOutputDir}`);
	}
}
