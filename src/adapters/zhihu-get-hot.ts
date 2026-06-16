import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat } from "./utils.js";

export default defineAdapter({
	command: "zhihu/get-hot",
	platform: "zhihu",
	language: "zh",
	category: "zh-general",
	board_type: "hot-search",

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) return null;

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const [heat, heat_raw] = parseHeat(entry.hot);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: cleanText(entry.url),
			heat,
			heat_raw,
			summary: null,
			tags: [],
		};
	},
});
