import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat, toArray } from "./utils.js";

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function formatVotes(value: unknown): string | null {
	if (value === null || value === undefined) {
		return null;
	}
	if (value === 1) {
		return "1 vote";
	}
	return `${value} votes`;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export default defineAdapter({
	command: "producthunt/get-trending",
	platform: "producthunt",
	language: "en",
	category: "en-general",
	board_type: "trending",

	variant(_, data) {
		return typeof data.date === "string" ? data.date : "_";
	},

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) return null;

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const heat_raw = parseHeat(entry.votes)[1];
		const heat = formatVotes(entry.votes);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: cleanText(entry.url),
			heat,
			heat_raw,
			summary: cleanText(entry.tagline),
			tags: toArray(entry.topics),
		};
	},
});
