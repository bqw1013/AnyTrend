/**
 * Zod schemas and TypeScript types for the Daily Site aggregation pipeline.
 *
 * Defines the shapes of inputs (merged rows, annotated rows, site config),
 * intermediate records (items.jsonl), and final outputs (sources.json,
 * homepage.json, feeds.json, themes.json).
 */

import { z } from "zod";

/** Integer score in the 1–5 range used for homepage and feed rankings. */
export const scoreSchema = z.number().int().min(1).max(5);

/** A single feed score entry. */
export const feedScoreSchema = z.object({
	score: scoreSchema,
	reason: z.string(),
});

/** A row from `merged.jsonl`. */
export const mergedItemSchema = z.object({
	id: z.string(),
	rank: z.number().int().nullable(),
	title: z.string(),
	url: z.string().nullable(),
	heat: z.string().nullable(),
	heat_raw: z.number().nullable(),
	summary: z.string().nullable(),
	tags: z.string().array(),
	_source: z.object({
		platform: z.string(),
		angle: z.string(),
	}),
});

/** A row from `annotated.jsonl`. */
export const annotatedItemSchema = z.object({
	id: z.string(),
	category_id: z.string(),
	category_reason: z.string(),
	title: z.string(),
	summary: z.string().nullable(),
	homepage_score: scoreSchema,
	homepage_reason: z.string(),
	feed_scores: z.record(z.string(), feedScoreSchema),
});

/** A category definition from `config/site.yaml`. */
export const siteCategorySchema = z.object({
	id: z.string(),
	name: z.string(),
	order: z.number().int(),
	definition: z.string(),
});

/** A feed definition from `config/site.yaml`. */
export const siteFeedSchema = z.object({
	id: z.string(),
	title: z.string(),
	criteria: z.string(),
});

/** Parsed `config/site.yaml`. */
export const siteConfigSchema = z.object({
	homepage: z.object({
		recommendation_count: z.number().int(),
		criteria: z.string(),
	}),
	categories: siteCategorySchema.array(),
	feeds: siteFeedSchema.array(),
});

/** A joined item written to `items.jsonl`. */
export const aggregatedItemSchema = z.object({
	id: z.string(),
	rank: z.number().int().nullable(),
	title: z.string(),
	summary: z.string().nullable(),
	url: z.string().nullable(),
	heat: z.string().nullable(),
	heat_raw: z.number().nullable(),
	tags: z.string().array(),
	platform: z.string(),
	angle: z.string(),
	category_id: z.string(),
	category_reason: z.string(),
	homepage_score: scoreSchema,
	homepage_reason: z.string(),
	feed_scores: z.record(z.string(), feedScoreSchema),
});

/** A candidate appearing in homepage.json or feeds.json. */
export const candidateSchema = z.object({
	item_id: z.string(),
	title: z.string(),
	summary: z.string(),
	url: z.string().nullable(),
	heat: z.string().nullable(),
	platform: z.string(),
	angle: z.string(),
	category_id: z.string(),
	score: z.number().int(),
	reason: z.string(),
	order: z.number().int(),
	rank: z.number().int().nullable(),
	heat_raw: z.number().nullable(),
	tags: z.string().array(),
	category_reason: z.string(),
});

/** Output shape of `sources.json`. */
export const sourcesOutputSchema = z.object({
	platforms: z
		.object({
			platform: z.string(),
			angles: z
				.object({
					angle: z.string(),
					item_ids: z.string().array(),
				})
				.array(),
		})
		.array(),
});

/** Output shape of `homepage.json`. */
export const homepageOutputSchema = z.object({
	summary: z.string(),
	candidates: candidateSchema.array(),
});

/** Output shape of `feeds.json`. */
export const feedsOutputSchema = z.object({
	feeds: z
		.object({
			id: z.string(),
			title: z.string(),
			criteria: z.string(),
			candidates: candidateSchema.array(),
		})
		.array(),
});

/** Output shape of `themes.json`. */
export const themesOutputSchema = z.object({
	categories: z
		.object({
			category_id: z.string(),
			name: z.string(),
			order: z.number().int(),
			item_ids: z.string().array(),
		})
		.array(),
});

/** A row from `merged.jsonl`. */
export type MergedItem = z.infer<typeof mergedItemSchema>;

/** A row from `annotated.jsonl`. */
export type AnnotatedItem = z.infer<typeof annotatedItemSchema>;

/** A single feed score entry. */
export type FeedScore = z.infer<typeof feedScoreSchema>;

/** A category definition from `config/site.yaml`. */
export type SiteCategory = z.infer<typeof siteCategorySchema>;

/** A feed definition from `config/site.yaml`. */
export type SiteFeed = z.infer<typeof siteFeedSchema>;

/** Parsed `config/site.yaml`. */
export type SiteConfig = z.infer<typeof siteConfigSchema>;

/** A joined item written to `items.jsonl`. */
export type AggregatedItem = z.infer<typeof aggregatedItemSchema>;

/** A candidate appearing in homepage.json or feeds.json. */
export type Candidate = z.infer<typeof candidateSchema>;

/** Output shape of `sources.json`. */
export type SourcesOutput = z.infer<typeof sourcesOutputSchema>;

/** Output shape of `homepage.json`. */
export type HomepageOutput = z.infer<typeof homepageOutputSchema>;

/** Output shape of `feeds.json`. */
export type FeedsOutput = z.infer<typeof feedsOutputSchema>;

/** Output shape of `themes.json`. */
export type ThemesOutput = z.infer<typeof themesOutputSchema>;
