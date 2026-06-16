import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat, toArray } from "./utils.js";

export default defineAdapter({
	command: "weibo/get-hot-search",
	platform: "weibo",
	language: "zh",
	category: "zh-general",
	board_type: "hot-search",

	items(raw, data) {
		if (Array.isArray(raw.data)) return raw.data;
		return (data.items as unknown[] | undefined) ?? [];
	},

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) return null;

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const [heat, heat_raw] = parseHeat(entry.heat);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: cleanText(entry.url),
			heat,
			heat_raw,
			summary: null,
			tags: toArray(entry.tag),
		};
	},
});
