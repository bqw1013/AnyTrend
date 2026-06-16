import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat, toArray } from "./utils.js";

function _buildSearchUrl(keyword: unknown): string | null {
	if (!keyword) return null;
	return `https://search.bilibili.com/all?keyword=${encodeURIComponent(String(keyword))}`;
}

export default defineAdapter({
	command: "bilibili/get-hot",
	platform: "bilibili",
	language: "zh",
	category: "zh-general",
	board_type: "hot-search",

	mapItem(entry, context) {
		const title = cleanText(entry.show_name) ?? cleanText(entry.keyword);
		if (!title) return null;

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const [heat, heat_raw] = parseHeat(entry.heat_score);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: _buildSearchUrl(entry.keyword),
			heat,
			heat_raw,
			summary: null,
			tags: toArray(entry.heat_layer),
		};
	},
});
