/**
 * Common utility functions for AnyTrend adapters.
 */

import he from "he";
import type { RawError, RawInput, ResponseMeta } from "../types/index.js";

// ---------------------------------------------------------------------------
// Type guards & data extraction
// ---------------------------------------------------------------------------

/** Type guard: checks whether a value is a plain object (not null, not an array). */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Extracts `raw.data` as a plain object, falling back to `{}`. */
export function getDataObject(raw: RawInput): Record<string, unknown> {
	return isRecord(raw.data) ? raw.data : {};
}

/** Extracts `raw.data` as an array, falling back to `[]`. */
export function getDataArray(raw: RawInput): unknown[] {
	return Array.isArray(raw.data) ? raw.data : [];
}

// ---------------------------------------------------------------------------
// General helpers
// ---------------------------------------------------------------------------

/** Returns the current time as an ISO 8601 string (UTC). */
export function nowIso(): string {
	return new Date().toISOString();
}

/**
 * Generates a platform-scoped unique id.
 *
 * Example:
 *   generateId("baidu", "realtime", 1, "title") -> "baidu:realtime:1:title"
 */
export function generateId(platform: string, ...parts: unknown[]): string {
	const safeParts = parts.map((part) => {
		let text: string;
		if (part === null || part === undefined) {
			text = "_";
		} else {
			text = String(part);
		}
		text = text.replace(/:/g, "_").replace(/\n/g, " ").trim();
		return text || "_";
	});
	return [platform, ...safeParts].join(":");
}

/**
 * Cleans a text field.
 *
 * - null / undefined -> null
 * - empty or whitespace-only string -> null
 * - otherwise -> trim and decode HTML entities
 */
export function cleanText(value: unknown): string | null {
	if (value === null || value === undefined) {
		return null;
	}
	const text = he.decode(String(value).trim());
	if (!text) {
		return null;
	}
	return text;
}

/** Converts a single value or empty value into a string array. */
export function toArray(value: unknown): string[] {
	if (value === null || value === undefined) {
		return [];
	}
	if (Array.isArray(value)) {
		return value.map((item) => cleanText(item)).filter((text): text is string => text !== null);
	}
	if (typeof value === "string" && value.trim() === "") {
		return [];
	}
	const text = cleanText(value);
	return text !== null ? [text] : [];
}

/**
 * Extracts a number from a string and returns it as an integer.
 *
 * Supports Chinese units (wan = 10^4, yi = 10^8) and SI suffixes (K / M).
 *
 * Examples:
 * - "780 wan" -> 7800000
 * - "1.4 wan" -> 14000
 * - "6.9M runs" -> 6900000
 * - "3.8K runs" -> 3800
 * - "5468 views" -> 5468
 */
export function parseNumber(value: unknown): number | null {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "boolean") {
		return null;
	}
	if (typeof value === "number") {
		return Math.trunc(value);
	}

	const text = String(value).trim();
	if (!text) {
		return null;
	}

	const match = text.match(/^\s*([\d.,]+)\s*(万|亿|K|M|k|m)?\s*.*$/);
	if (match) {
		const numStr = match[1];
		if (!numStr) {
			return null;
		}
		const unit = (match[2] ?? "").toLowerCase();
		const num = Number.parseFloat(numStr.replace(/,/g, ""));
		if (Number.isNaN(num)) {
			return null;
		}
		const multiplier: Record<string, number> = {
			万: 10_000,
			亿: 100_000_000,
			k: 1_000,
			m: 1_000_000,
		};
		return Math.trunc(num * (multiplier[unit] ?? 1));
	}

	const digits = text.replace(/[^\d.]/g, "");
	if (!digits) {
		return null;
	}
	const n = Number.parseFloat(digits);
	return Number.isNaN(n) ? null : Math.trunc(n);
}

/**
 * Converts a number to human-readable text.
 *
 * Uses Chinese units (wan = 10^4, yi = 10^8) for large values.
 *
 * Examples:
 * - 7800000 -> "780 wan"
 * - 14000 -> "1.4 wan"
 * - 5468 -> "5468"
 */
export function formatCount(n: number): string {
	if (n >= 100_000_000) {
		const val = n / 100_000_000;
		return `${val.toFixed(1).replace(/\.0+$/, "")}亿`;
	}
	if (n >= 10_000) {
		const val = n / 10_000;
		return `${val.toFixed(1).replace(/\.0+$/, "")}万`;
	}
	return String(n);
}

/** Parses a heat value, returning [heat_text, heat_raw]. */
export function parseHeat(value: unknown): [string | null, number | null] {
	if (value === null || value === undefined) {
		return [null, null];
	}
	if (typeof value === "number" && !Number.isNaN(value)) {
		const n = Math.trunc(value);
		return [formatCount(n), n];
	}

	const text = String(value).trim();
	if (!text) {
		return [null, null];
	}

	const raw = parseNumber(text);
	if (raw !== null) {
		if (/^[\d,]+(\.\d+)?$/.test(text)) {
			return [formatCount(raw), raw];
		}
		return [text, raw];
	}

	return [text, null];
}

/** Normalizes a time string to ISO 8601 when possible. */
export function parseTime(value: unknown): string | null {
	if (value === null || value === undefined) {
		return null;
	}
	const text = String(value).trim();
	if (!text) {
		return null;
	}

	if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
		return text;
	}

	const slashMatch = text.match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/);
	if (slashMatch) {
		const [, y, mo, d, h, mi] = slashMatch;
		return `${y}-${mo}-${d}T${h}:${mi}:00+08:00`;
	}

	const dashMatch = text.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
	if (dashMatch) {
		const [, y, mo, d, h, mi, s] = dashMatch;
		return `${y}-${mo}-${d}T${h}:${mi}:${s}+08:00`;
	}

	return text;
}

function normalizeError(error: unknown): RawError | null {
	if (error === null || error === undefined) {
		return null;
	}
	if (typeof error === "string") {
		return { code: "UNKNOWN_ERROR", message: error };
	}
	if (typeof error === "object") {
		const e = error as Record<string, unknown>;
		const code = typeof e.code === "string" ? e.code : "UNKNOWN_ERROR";
		const message = typeof e.message === "string" ? e.message : String(error);
		return { code, message };
	}
	return { code: "UNKNOWN_ERROR", message: String(error) };
}

/** Builds unified response_meta from raw output. */
export function buildResponseMeta(raw: RawInput): ResponseMeta {
	const success = raw.success ?? false;
	const meta = isRecord(raw.meta) ? raw.meta : {};
	const error = success ? null : normalizeError(raw.error);

	return {
		success,
		duration: typeof meta.duration === "number" ? meta.duration : null,
		raw_total: extractTotal(raw),
		error,
	};
}

/** Attempts to extract the total item count from raw output. */
export function extractTotal(raw: RawInput): number | null {
	const data = raw.data;
	if (isRecord(data)) {
		for (const key of ["total", "total_count", "totalCount", "count", "publishedArticlesCount"]) {
			const value = data[key];
			if (value !== null && value !== undefined) {
				const n = Number(value);
				if (!Number.isNaN(n)) {
					return Math.trunc(n);
				}
			}
		}
	} else if (Array.isArray(data)) {
		return data.length;
	}
	return null;
}
