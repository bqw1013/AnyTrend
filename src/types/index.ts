/**
 * TypeScript type definitions for the AnyTrend Normalize Schema v1.
 *
 * Specification: docs/normalize/schema-v1.md
 */

/** Supported content categories. */
export const CATEGORY_VALUES = ["zh-general", "en-general", "zh-ai", "en-ai"] as const;

/** Content category value. */
export type Category = (typeof CATEGORY_VALUES)[number];

/** Supported board types. */
export const BOARD_TYPE_VALUES = ["hot-search", "trending", "top", "latest", "feed", "papers"] as const;

/** Board type value. */
export type BoardType = (typeof BOARD_TYPE_VALUES)[number];

/** Supported content languages. */
export const LANGUAGE_VALUES = ["zh", "en"] as const;

/** Language code. */
export type Language = (typeof LANGUAGE_VALUES)[number];

/** Original command error information. */
export interface RawError {
	code: string;
	message: string;
}

/** Unified response metadata. */
export interface ResponseMeta {
	success: boolean;
	duration: number | null;
	raw_total: number | null;
	error: RawError | null;
}

/** Unified single entry. */
export interface NormalizedItem {
	id: string;
	rank: number | null;
	title: string;
	url: string | null;
	heat: string | null;
	heat_raw: number | null;
	summary: string | null;
	tags: string[];
}

/** Full normalized output produced by an adapter. */
export interface NormalizedOutput {
	version: string;
	generated_at: string;
	command: string;
	platform: string;
	language: Language;
	category: Category;
	board_type: BoardType;
	response_meta: ResponseMeta;
	items: NormalizedItem[];
}

/** Minimum structure of a WebSculpt raw output. */
export interface RawInput {
	command?: string;
	success?: boolean;
	params?: Record<string, unknown>;
	meta?: {
		duration?: number;
		[key: string]: unknown;
	};
	data?: Record<string, unknown> | unknown[];
	error?: RawError | string | unknown;
	[key: string]: unknown;
}

/** Adapter direct return output (without the version / generated_at added by the caller). */
export type AdapterOutput = Omit<NormalizedOutput, "version" | "generated_at">;

/** Interface that a single adapter module must export. */
export interface AdapterModule {
	PLATFORM: string;
	LANGUAGE: Language;
	CATEGORY: Category;
	BOARD_TYPE: BoardType;
	normalize(raw: RawInput): AdapterOutput;
}
