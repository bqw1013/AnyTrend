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

const MAX_TAGLINE_LENGTH = 80;

/**
 * Build a self-explanatory title from the product name and its tagline.
 *
 * Product Hunt titles are often just product names (e.g. "jebi"), which are
 * hard to understand without context. Appending the tagline makes the entry
 * readable on pages that only show the title, while keeping the description
 * short enough to avoid layout issues.
 */
function buildTitle(name: string, tagline: string | null): string {
	if (!tagline) {
		return name;
	}
	const shortTagline = tagline.length > MAX_TAGLINE_LENGTH ? `${tagline.slice(0, MAX_TAGLINE_LENGTH)}…` : tagline;
	return `${name} — ${shortTagline}`;
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
		const name = cleanText(entry.title);
		if (!name) return null;

		const tagline = cleanText(entry.tagline);
		const title = buildTitle(name, tagline);
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
			summary: tagline,
			tags: toArray(entry.topics),
		};
	},
});
