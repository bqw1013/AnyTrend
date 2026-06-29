/**
 * Daily Site aggregation pipeline.
 *
 * Orchestrates loading `merged.jsonl` + `annotated.jsonl`, validating the
 * annotated rows, joining them into `items.jsonl`, and deriving
 * `sources.json`, `homepage.json`, `feeds.json`, and `themes.json`.
 */

import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load as loadYaml } from "js-yaml";
import type { z } from "zod";
import { COLLECT_PLAN, type CollectCall } from "../config/collect-plan.js";
import {
	type AggregatedItem,
	type AnnotatedItem,
	annotatedItemSchema,
	type FeedScore,
	type MergedItem,
	mergedItemSchema,
	type SiteConfig,
	siteConfigSchema,
} from "../types/daily-site.js";
import { defaultLogger, type Logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultSiteConfigPath = path.resolve(__dirname, "..", "..", "config", "site.yaml");
const defaultDataDir = path.resolve("anytrend-data", "daily");

/** Options for `runDailySiteAggregate`. */
export interface RunDailySiteAggregateOptions {
	/** Base directory containing daily archives (default: `anytrend-data/daily`). */
	dataDir?: string;
	/** Archive date folder name (YYYY-MM-DD). */
	date: string;
	/** Skip `annotated.jsonl` validation. */
	skipValidation?: boolean;
	/** Logger for progress and errors. */
	logger?: Logger;
	/** Optional collect plan for tests; defaults to `src/config/collect-plan`. */
	collectPlan?: CollectCall[];
	/** Optional site config path for tests; defaults to project-root `config/site.yaml`. */
	siteConfigPath?: string;
}

/** Result of `runDailySiteAggregate`. */
export interface RunDailySiteAggregateResult {
	/** Number of items written to `items.jsonl`. */
	itemsCount: number;
	/** Number of annotated rows skipped because no matching merged row existed. */
	skippedCount: number;
}

/** A single JSONL line with its original 1-based line number. */
export interface LineItem<T> {
	lineNumber: number;
	value: T;
}

/** A validation error tied to a specific `annotated.jsonl` line. */
export interface ValidationError {
	lineNumber: number;
	message: string;
}

/**
 * Parse `config/site.yaml` and return a typed site configuration.
 *
 * @param configPath Path to the YAML file.
 * @throws When the file cannot be read or does not match the expected schema.
 */
export async function loadSiteConfig(configPath: string): Promise<SiteConfig> {
	const raw = await readFile(configPath, "utf-8");
	const parsed = loadYaml(raw) as unknown;
	const result = siteConfigSchema.safeParse(parsed);
	if (!result.success) {
		throw new Error(`Invalid site config ${configPath}: ${result.error.message}`);
	}
	return result.data;
}

/**
 * Return the daily collection plan used to order platforms and angles.
 *
 * The default implementation imports the real plan from
 * `src/config/collect-plan.ts` (resolved to `.js` at runtime). Tests can
 * inject a different plan through `RunDailySiteAggregateOptions.collectPlan`.
 */
export function loadCollectPlan(): CollectCall[] {
	return COLLECT_PLAN;
}

/**
 * Read a JSONL file line by line, invoking `parser` for each non-empty line.
 *
 * @param filePath Path to the JSONL file.
 * @param parser Receives the parsed JSON value and 1-based line number.
 * @returns Array of parsed values paired with their line numbers.
 * @throws When the file cannot be read, a line contains invalid JSON, or the
 *   parser throws.
 */
export async function readJsonl<T>(
	filePath: string,
	parser: (raw: unknown, lineNumber: number) => T,
): Promise<LineItem<T>[]> {
	const content = await readFile(filePath, "utf-8");
	const lines = content.split(/\r?\n/);
	const result: LineItem<T>[] = [];

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

		const value = parser(parsed, index + 1);
		result.push({ lineNumber: index + 1, value });
	}

	return result;
}

function formatZodError(error: z.ZodError<unknown>): string {
	return error.issues.map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`).join("; ");
}

/**
 * Validate one annotated row against business rules defined in `siteConfig`.
 *
 * Schema-level checks (required fields, score ranges, reason types) are
 * performed by `validateAnnotatedFile` before this function is called.
 */
export function validateAnnotatedItem(
	item: AnnotatedItem,
	lineNumber: number,
	siteConfig: SiteConfig,
): ValidationError[] {
	const errors: ValidationError[] = [];
	const categoryIds = new Set(siteConfig.categories.map((category) => category.id));

	if (!categoryIds.has(item.category_id)) {
		errors.push({
			lineNumber,
			message: `Invalid category_id "${item.category_id}". Allowed: ${[...categoryIds].join(", ")}`,
		});
	}

	const requiredFeeds = siteConfig.feeds;
	for (const feed of requiredFeeds) {
		const feedScore: FeedScore | undefined = item.feed_scores[feed.id];
		if (feedScore === undefined) {
			errors.push({ lineNumber, message: `Missing feed score for "${feed.id}"` });
			continue;
		}
		if (!Number.isInteger(feedScore.score) || feedScore.score < 1 || feedScore.score > 5) {
			errors.push({
				lineNumber,
				message: `Invalid score for feed "${feed.id}": ${feedScore.score} (must be integer 1–5)`,
			});
		}
		if (typeof feedScore.reason !== "string") {
			errors.push({
				lineNumber,
				message: `Invalid reason for feed "${feed.id}": must be a string`,
			});
		}
	}

	return errors;
}

/**
 * Validate every raw annotated row, returning all errors found.
 *
 * Runs the Zod schema parse first; rows that fail schema validation are
 * reported and do not proceed to business-rule checks.
 */
export function validateAnnotatedFile(rawLines: LineItem<unknown>[], siteConfig: SiteConfig): ValidationError[] {
	const errors: ValidationError[] = [];

	for (const { lineNumber, value: raw } of rawLines) {
		const schemaResult = annotatedItemSchema.safeParse(raw);
		if (!schemaResult.success) {
			errors.push({ lineNumber, message: formatZodError(schemaResult.error) });
			continue;
		}
		errors.push(...validateAnnotatedItem(schemaResult.data, lineNumber, siteConfig));
	}

	return errors;
}

/** Result of joining merged and annotated rows. */
export interface BuildItemsResult {
	items: AggregatedItem[];
	skippedCount: number;
}

/**
 * Join annotated rows with merged rows by `id` to produce `items.jsonl` records.
 *
 * Annotated rows without a matching merged row are skipped and counted.
 */
export function buildItemsJsonl(mergedItems: MergedItem[], annotatedItems: AnnotatedItem[]): BuildItemsResult {
	const mergedById = new Map(mergedItems.map((item) => [item.id, item]));
	const items: AggregatedItem[] = [];
	let skippedCount = 0;

	for (const annotated of annotatedItems) {
		const merged = mergedById.get(annotated.id);
		if (merged === undefined) {
			skippedCount++;
			continue;
		}

		const item: AggregatedItem = {
			id: annotated.id,
			rank: merged.rank,
			title: annotated.title,
			summary: annotated.summary,
			url: merged.url,
			heat: merged.heat,
			heat_raw: merged.heat_raw,
			tags: merged.tags,
			platform: merged._source.platform,
			angle: merged._source.angle,
			category_id: annotated.category_id,
			category_reason: annotated.category_reason,
			homepage_score: annotated.homepage_score,
			homepage_reason: annotated.homepage_reason,
			feed_scores: annotated.feed_scores,
		};
		items.push(item);
	}

	return { items, skippedCount };
}

function compareByScore(a: AggregatedItem, b: AggregatedItem, getScore: (item: AggregatedItem) => number): number {
	const scoreA = getScore(a);
	const scoreB = getScore(b);
	if (scoreA !== scoreB) {
		return scoreB - scoreA;
	}
	const heatA = a.heat_raw ?? 0;
	const heatB = b.heat_raw ?? 0;
	if (heatA !== heatB) {
		return heatB - heatA;
	}
	const rankA = a.rank ?? Number.POSITIVE_INFINITY;
	const rankB = b.rank ?? Number.POSITIVE_INFINITY;
	if (rankA !== rankB) {
		return rankA - rankB;
	}
	return a.id.localeCompare(b.id);
}

function compareForHomepage(a: AggregatedItem, b: AggregatedItem): number {
	return compareByScore(a, b, (item) => item.homepage_score);
}

const DEFAULT_CANDIDATE_RATIO = 0.2;
const DEFAULT_MAX_CANDIDATES = 50;
const DEFAULT_INITIAL_MIN_SCORE = 4;

function computeCandidateTarget(count: number): number {
	if (count <= 0) return 0;
	return Math.min(Math.max(1, Math.ceil(count * DEFAULT_CANDIDATE_RATIO)), DEFAULT_MAX_CANDIDATES);
}

/**
 * Select the candidate pool for homepage or a single feed.
 *
 * Strategy (adaptive, no configuration):
 * 1. Target count = min(ceil(total × 20%), 50).
 * 2. Start with score >= 4.
 * 3. If too few items meet that bar, lower the threshold by 1 repeatedly
 *    until we have enough items or reach score >= 1.
 * 4. Sort the surviving pool by score descending with tie-breakers and
 *    return the top `target` items.
 */
function selectCandidates(items: AggregatedItem[], getScore: (item: AggregatedItem) => number): AggregatedItem[] {
	const target = computeCandidateTarget(items.length);
	if (target === 0) return [];

	let minScore = DEFAULT_INITIAL_MIN_SCORE;
	let pool = items;

	while (minScore > 1) {
		const filtered = items.filter((item) => getScore(item) >= minScore);
		if (filtered.length >= target) {
			pool = filtered;
			break;
		}
		minScore--;
	}

	return [...pool].sort((a, b) => compareByScore(a, b, getScore)).slice(0, target);
}

/**
 * Group items by platform and angle, ordering platforms/angles by the collect
 * plan and items within each angle by `rank` ascending.
 */
export function buildSourcesJson(
	items: AggregatedItem[],
	collectPlan: CollectCall[],
): import("../types/daily-site.js").SourcesOutput {
	const platformOrder = new Map<string, number>();
	const angleOrder = new Map<string, Map<string, number>>();

	for (let index = 0; index < collectPlan.length; index++) {
		const call = collectPlan[index];
		if (call === undefined) continue;
		if (!platformOrder.has(call.platform)) {
			platformOrder.set(call.platform, index);
		}
		if (!angleOrder.has(call.platform)) {
			angleOrder.set(call.platform, new Map());
		}
		const angles = angleOrder.get(call.platform);
		if (angles !== undefined && !angles.has(call.angle)) {
			angles.set(call.angle, index);
		}
	}

	const platformGroups = new Map<string, Map<string, AggregatedItem[]>>();
	for (const item of items) {
		if (!platformGroups.has(item.platform)) {
			platformGroups.set(item.platform, new Map());
		}
		const angles = platformGroups.get(item.platform);
		if (angles === undefined) continue;
		if (!angles.has(item.angle)) {
			angles.set(item.angle, []);
		}
		const angleItems = angles.get(item.angle);
		if (angleItems !== undefined) {
			angleItems.push(item);
		}
	}

	const platforms = [...platformGroups.keys()].sort((a, b) => {
		const orderA = platformOrder.get(a) ?? Number.MAX_SAFE_INTEGER;
		const orderB = platformOrder.get(b) ?? Number.MAX_SAFE_INTEGER;
		if (orderA !== orderB) return orderA - orderB;
		return a.localeCompare(b);
	});

	const platformsOutput = platforms.map((platform) => {
		const anglesMap = platformGroups.get(platform);
		const angles = [...(anglesMap?.keys() ?? [])].sort((a, b) => {
			const anglesOrder = angleOrder.get(platform) ?? new Map();
			const orderA = anglesOrder.get(a) ?? Number.MAX_SAFE_INTEGER;
			const orderB = anglesOrder.get(b) ?? Number.MAX_SAFE_INTEGER;
			if (orderA !== orderB) return orderA - orderB;
			return a.localeCompare(b);
		});

		return {
			platform,
			angles: angles.map((angle) => {
				const angleItems = anglesMap?.get(angle) ?? [];
				const sorted = angleItems.sort((a, b) => {
					const rankA = a.rank ?? Number.POSITIVE_INFINITY;
					const rankB = b.rank ?? Number.POSITIVE_INFINITY;
					if (rankA !== rankB) return rankA - rankB;
					return a.id.localeCompare(b.id);
				});
				return {
					angle,
					item_ids: sorted.map((item) => item.id),
				};
			}),
		};
	});

	return { platforms: platformsOutput };
}

/**
 * Select the homepage candidate pool using an adaptive score threshold.
 * `summary` is left empty for a downstream AI to fill.
 */
export function buildHomepageJson(
	items: AggregatedItem[],
	_siteConfig: SiteConfig,
): import("../types/daily-site.js").HomepageOutput {
	const sorted = selectCandidates(items, (item) => item.homepage_score);
	const candidates = sorted.map((item, index) => ({
		item_id: item.id,
		title: item.title,
		summary: item.summary ?? "",
		url: item.url,
		heat: item.heat,
		platform: item.platform,
		angle: item.angle,
		category_id: item.category_id,
		score: item.homepage_score,
		reason: item.homepage_reason,
		order: index + 1,
		rank: item.rank,
		heat_raw: item.heat_raw,
		tags: item.tags,
		category_reason: item.category_reason,
	}));

	return { summary: "", candidates };
}

/**
 * Build one candidate pool per feed defined in the site config, ranking items
 * by their feed-specific score.
 */
export function buildFeedsJson(
	items: AggregatedItem[],
	siteConfig: SiteConfig,
): import("../types/daily-site.js").FeedsOutput {
	const feeds = siteConfig.feeds.map((feed) => {
		const sorted = selectCandidates(items, (item) => item.feed_scores[feed.id]?.score ?? 0);
		const candidates = sorted.map((item, index) => {
			const feedScore = item.feed_scores[feed.id] ?? { score: 0, reason: "" };
			return {
				item_id: item.id,
				title: item.title,
				summary: item.summary ?? "",
				url: item.url,
				heat: item.heat,
				platform: item.platform,
				angle: item.angle,
				category_id: item.category_id,
				score: feedScore.score,
				reason: feedScore.reason,
				order: index + 1,
				rank: item.rank,
				heat_raw: item.heat_raw,
				tags: item.tags,
				category_reason: item.category_reason,
			};
		});

		return {
			id: feed.id,
			title: feed.title,
			criteria: feed.criteria,
			candidates,
		};
	});

	return { feeds };
}

/**
 * Group items by category, preserving all categories from the site config even
 * when they have no items. Items within each category are ordered by the same
 * tie-breaker rules used for the homepage.
 */
export function buildThemesJson(
	items: AggregatedItem[],
	siteConfig: SiteConfig,
): import("../types/daily-site.js").ThemesOutput {
	const itemsByCategory = new Map<string, AggregatedItem[]>();
	for (const item of items) {
		const list = itemsByCategory.get(item.category_id) ?? [];
		list.push(item);
		itemsByCategory.set(item.category_id, list);
	}

	const categories = siteConfig.categories.map((category) => {
		const categoryItems = itemsByCategory.get(category.id) ?? [];
		const sorted = [...categoryItems].sort(compareForHomepage);
		return {
			category_id: category.id,
			name: category.name,
			order: category.order,
			item_ids: sorted.map((item) => item.id),
		};
	});

	return { categories };
}

/**
 * Run the full Daily Site aggregation for a single archive date.
 *
 * @returns Summary counts for the aggregated items.
 * @throws When required input files are missing, validation fails, or writing
 *   output files fails.
 */
export async function runDailySiteAggregate(
	options: RunDailySiteAggregateOptions,
): Promise<RunDailySiteAggregateResult> {
	const logger = options.logger ?? defaultLogger;
	const dataDir = options.dataDir ?? defaultDataDir;
	const date = options.date;
	const skipValidation = options.skipValidation ?? false;
	const siteConfigPath = options.siteConfigPath ?? defaultSiteConfigPath;
	const collectPlan = options.collectPlan ?? loadCollectPlan();

	const archiveDir = path.resolve(dataDir, date);
	const mergedPath = path.join(archiveDir, "merged.jsonl");
	const annotatedPath = path.join(archiveDir, "annotated.jsonl");

	for (const [label, filePath] of [
		["merged.jsonl", mergedPath],
		["annotated.jsonl", annotatedPath],
	] as const) {
		try {
			await stat(filePath);
		} catch {
			throw new Error(`${label} not found for date ${date}: ${filePath}`);
		}
	}

	const [siteConfig, mergedLines] = await Promise.all([
		loadSiteConfig(siteConfigPath),
		readJsonl(mergedPath, (raw, lineNumber) => {
			const result = mergedItemSchema.safeParse(raw);
			if (!result.success) {
				throw new Error(`Invalid merged item at line ${lineNumber} in ${mergedPath}: ${result.error.message}`);
			}
			return result.data;
		}),
	]);

	const mergedItems = mergedLines.map((line) => line.value);

	let annotatedItems: AnnotatedItem[];
	if (skipValidation) {
		// `--skip-validation` intentionally bypasses schema and business-rule
		// checks. We cast each parsed JSON line to AnnotatedItem and let
		// aggregation fail naturally if a required field is truly missing.
		const annotatedLines = await readJsonl(annotatedPath, (raw) => raw as AnnotatedItem);
		annotatedItems = annotatedLines.map((line) => line.value);
	} else {
		const annotatedRawLines = await readJsonl(annotatedPath, (raw) => raw);
		const validationErrors = validateAnnotatedFile(annotatedRawLines, siteConfig);
		if (validationErrors.length > 0) {
			const messages = validationErrors.map((err) => `Line ${err.lineNumber}: ${err.message}`).join("\n");
			throw new Error(`annotated.jsonl validation failed:\n${messages}`);
		}
		annotatedItems = annotatedRawLines.map((line) => annotatedItemSchema.parse(line.value));
	}

	const { items, skippedCount } = buildItemsJsonl(mergedItems, annotatedItems);
	const sources = buildSourcesJson(items, collectPlan);
	const homepage = buildHomepageJson(items, siteConfig);
	const feeds = buildFeedsJson(items, siteConfig);
	const themes = buildThemesJson(items, siteConfig);

	const outputs = [
		{
			file: "items.jsonl",
			content: items.map((item) => JSON.stringify(item)).join("\n") + (items.length > 0 ? "\n" : ""),
		},
		{ file: "sources.json", content: JSON.stringify(sources, null, 2) },
		{ file: "homepage.json", content: JSON.stringify(homepage, null, 2) },
		{ file: "feeds.json", content: JSON.stringify(feeds, null, 2) },
		{ file: "themes.json", content: JSON.stringify(themes, null, 2) },
	];

	await mkdir(archiveDir, { recursive: true });

	const writtenFiles: string[] = [];
	try {
		for (const { file, content } of outputs) {
			const filePath = path.join(archiveDir, file);
			await writeFile(filePath, content, "utf-8");
			writtenFiles.push(filePath);
		}
	} catch (err) {
		for (const filePath of writtenFiles) {
			await rm(filePath, { force: true });
		}
		throw err;
	}

	if (skippedCount > 0) {
		logger.warn(`Skipped ${skippedCount} annotated item(s) without matching merged item`);
	}
	logger.info(
		`Daily site aggregation complete for ${date}: ${items.length} items, ${homepage.candidates.length} homepage candidates, ${feeds.feeds.length} feeds, ${themes.categories.length} categories`,
	);

	return { itemsCount: items.length, skippedCount };
}
