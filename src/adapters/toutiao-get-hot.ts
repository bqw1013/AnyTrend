import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat, toArray } from "./utils.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isHotBoardItem(item: Record<string, unknown>): boolean {
	return "hotValue" in item || "rank" in item;
}

function detectBoardType(items: unknown[]): "hot-search" | "feed" {
	if (items.length > 0 && typeof items[0] === "object" && items[0] !== null) {
		if (isHotBoardItem(items[0] as Record<string, unknown>)) {
			return "hot-search";
		}
	}
	return "feed";
}

function mergeTags(entry: Record<string, unknown>): string[] {
	const tags: string[] = [];
	const seen = new Set<string>();
	for (const key of ["tag", "label", "keywords"]) {
		for (const tag of toArray(entry[key])) {
			if (tag && !seen.has(tag)) {
				seen.add(tag);
				tags.push(tag);
			}
		}
	}
	return tags;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export default defineAdapter({
	command: "toutiao/get-hot",
	platform: "toutiao",
	language: "zh",
	category: "zh-general",
	board_type: (_raw, _data, items) => detectBoardType(items),

	variant: (_raw, data) => {
		if (typeof data.channel === "string") return data.channel;
		return "_";
	},

	mapItem: (entry, { platform, variant }) => {
		const title = cleanText(entry.title);
		if (!title) return null;

		if (isHotBoardItem(entry)) {
			const rank = typeof entry.rank === "number" ? entry.rank : null;
			const [heat, heat_raw] = parseHeat(entry.hotValue);
			return {
				id: generateId(platform, variant, rank, title),
				rank,
				title,
				url: cleanText(entry.url),
				heat,
				heat_raw,
				summary: null,
				tags: toArray(entry.label),
			};
		}

		// Feed entry
		return {
			id: generateId(platform, variant, null, title),
			rank: null,
			title,
			url: cleanText(entry.url),
			heat: null,
			heat_raw: null,
			summary: cleanText(entry.abstract),
			tags: mergeTags(entry),
		};
	},
});
