import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat, toArray } from "./utils.js";

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function detectMode(data: Record<string, unknown>): string {
	const mode = data.mode;
	if (mode) {
		return String(mode);
	}
	const items = Array.isArray(data.items) ? data.items : [];
	if (
		items.length > 0 &&
		typeof items[0] === "object" &&
		items[0] !== null &&
		!Array.isArray(items[0]) &&
		"fid" in (items[0] as Record<string, unknown>)
	) {
		return "search";
	}
	return "hot-rank";
}

function getVariant(raw: { params?: unknown }, mode: string): string {
	const params = raw.params;
	if (params && typeof params === "object" && !Array.isArray(params)) {
		const query = (params as Record<string, unknown>).query;
		if (query) {
			const text = String(query).trim();
			if (text) {
				return text;
			}
		}
	}
	if (mode) {
		return mode;
	}
	return "_";
}

function toNumberOrZero(value: unknown): number {
	if (typeof value === "number" && !Number.isNaN(value)) {
		return value;
	}
	if (typeof value === "string") {
		const n = Number(value);
		if (!Number.isNaN(n)) {
			return n;
		}
	}
	return 0;
}

function extractHeat(item: Record<string, unknown>, mode: string): [string | null, number | null] {
	if (mode === "hot-rank") {
		return parseHeat(item.tag);
	}

	const likes = toNumberOrZero(item.likes);
	const comments = toNumberOrZero(item.comments);
	const shares = toNumberOrZero(item.shares);
	const total = likes + comments + shares;
	if (total) {
		return parseHeat(total);
	}
	return [null, null];
}

function extractSummary(item: Record<string, unknown>, mode: string): string | null {
	if (mode === "search") {
		return cleanText(item.text) ?? cleanText(item.summary);
	}
	return null;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export default defineAdapter({
	command: "maimai/get-hot",
	platform: "maimai",
	language: "zh",
	category: "zh-ai",
	board_type: "hot-search",

	variant(raw, data) {
		const mode = detectMode(data);
		return getVariant(raw, mode);
	},

	mapItem(entry, context) {
		const mode = detectMode(context.data);

		const title = cleanText(entry.title);
		if (!title) return null;

		const rank = mode === "hot-rank" ? (typeof entry.rank === "number" ? entry.rank : null) : context.index + 1;

		const [heat, heat_raw] = extractHeat(entry, mode);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: cleanText(entry.url),
			heat,
			heat_raw,
			summary: extractSummary(entry, mode),
			tags: mode === "hot-rank" ? toArray(entry.tag) : [],
		};
	},
});
