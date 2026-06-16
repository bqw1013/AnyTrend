import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat, toArray } from "./utils.js";

export default defineAdapter({
	command: "baidu/get-hot",
	platform: "baidu",
	language: "zh",
	category: "zh-general",
	board_type: "hot-search",

	variant(_raw, data) {
		return (data.tab as string | undefined) ?? "_";
	},

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) return null;

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const [heat, heat_raw] = parseHeat(entry.heatIndex);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: cleanText(entry.url),
			heat,
			heat_raw,
			summary: cleanText(entry.description),
			tags: toArray(entry.tag),
		};
	},
});
