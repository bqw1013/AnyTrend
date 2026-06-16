import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat } from "./utils.js";

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export default defineAdapter({
	command: "xiaohongshu/get-feed",
	platform: "xiaohongshu",
	language: "zh",
	category: "zh-general",
	board_type: "feed",

	variant(_, data) {
		return cleanText(data.channel) ?? "_";
	},

	items(_, data) {
		return (data.notes as unknown[] | undefined) ?? [];
	},

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) return null;

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const [heat, heat_raw] = parseHeat(entry.likes);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: cleanText(entry.note_url),
			heat,
			heat_raw,
			summary: null,
			tags: [],
		};
	},
});
