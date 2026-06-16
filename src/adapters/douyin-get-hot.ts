import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat, toArray } from "./utils.js";

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function buildUrl(item: Record<string, unknown>): string | null {
	const itemId = item.item_id;
	if (!itemId) {
		return null;
	}
	const text = String(itemId).trim();
	if (!text) {
		return null;
	}
	return `https://www.douyin.com/video/${text}`;
}

function extractHeat(item: Record<string, unknown>): [string | null, number | null] {
	const hotScore = item.hot_score;
	if (typeof hotScore === "number" && !Number.isNaN(hotScore) && hotScore) {
		return parseHeat(hotScore);
	}

	const playCount = item.play_count;
	if (typeof playCount === "number" && !Number.isNaN(playCount) && playCount) {
		return parseHeat(playCount);
	}

	return [null, null];
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export default defineAdapter({
	command: "douyin/get-hot",
	platform: "douyin",
	language: "zh",
	category: "zh-general",
	board_type: "trending",

	variant(raw, data) {
		const params = raw.params;
		if (params && typeof params === "object" && !Array.isArray(params)) {
			const variant = (params as Record<string, unknown>).type;
			if (variant !== undefined && variant !== null) {
				return String(variant);
			}
		}
		for (const key of ["type", "tag", "order", "period"]) {
			const value = data[key];
			if (value !== undefined && value !== null) {
				return String(value);
			}
		}
		return "_";
	},

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) return null;

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const [heat, heat_raw] = extractHeat(entry);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: buildUrl(entry),
			heat,
			heat_raw,
			summary: null,
			tags: toArray(entry.key_words),
		};
	},
});
