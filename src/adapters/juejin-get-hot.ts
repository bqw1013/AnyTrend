import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat, toArray } from "./utils.js";

export default defineAdapter({
	command: "juejin/get-hot",
	platform: "juejin",
	language: "zh",
	category: "zh-ai",
	board_type: "trending",

	variant(raw, data) {
		const rawParams = (raw as Record<string, unknown>).params;
		if (rawParams && typeof rawParams === "object" && !Array.isArray(rawParams)) {
			const sort = (rawParams as Record<string, unknown>).sort_type;
			if (sort !== undefined && sort !== null) return String(sort);
		}
		return (data.sort_type as string | undefined) ?? "_";
	},

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) return null;

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const [heat, heat_raw] = parseHeat(entry.hot_index);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: cleanText(entry.url),
			heat,
			heat_raw,
			summary: cleanText(entry.brief),
			tags: toArray(entry.tags),
		};
	},
});
