import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat } from "./utils.js";

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export default defineAdapter({
	command: "youtube/get-feed",
	platform: "youtube",
	language: "en",
	category: "en-general",
	board_type: "feed",

	variant(_, data) {
		return typeof data.tab === "string" ? data.tab : "_";
	},

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) return null;

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const [heat, heat_raw] = parseHeat(entry.views);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: cleanText(entry.videoUrl),
			heat,
			heat_raw,
			summary: null,
			tags: [],
		};
	},
});
