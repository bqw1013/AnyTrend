import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat, toArray } from "./utils.js";

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function formatUpvotes(value: unknown): string | null {
	if (value === null || value === undefined) {
		return null;
	}
	const n = typeof value === "number" ? value : Number(value);
	if (Number.isNaN(n)) {
		return null;
	}
	return `${n} upvote${n === 1 ? "" : "s"}`;
}

function cleanAuthors(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return toArray(value);
	}
	const result: string[] = [];
	for (const author of value) {
		const text = cleanText(author);
		if (text === null) {
			continue;
		}
		// Filter parser artifacts like "·\n8 authors"
		if (text.includes("·") && text.toLowerCase().includes("authors")) {
			continue;
		}
		result.push(text);
	}
	return result;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export default defineAdapter({
	command: "huggingface/get-papers",
	platform: "huggingface",
	language: "en",
	category: "en-ai",
	board_type: "papers",

	variant(_, data) {
		return typeof data.period === "string" ? data.period : "_";
	},

	items(_, data) {
		return (data.papers as unknown[] | undefined) ?? [];
	},

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) return null;

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const heat_raw = parseHeat(entry.upvotes)[1];
		const heat = formatUpvotes(entry.upvotes);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: cleanText(entry.url),
			heat,
			heat_raw,
			summary: cleanText(entry.abstract),
			tags: cleanAuthors(entry.authors),
		};
	},
});
