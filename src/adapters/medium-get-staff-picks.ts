import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat, toArray } from "./utils.js";

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function formatClaps(n: unknown): string | null {
	if (n === null || n === undefined) {
		return null;
	}
	if (typeof n === "number" && !Number.isNaN(n)) {
		return `${Math.trunc(n).toLocaleString("en-US")} claps`;
	}
	return `${n} claps`;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export default defineAdapter({
	command: "medium/get-staff-picks",
	platform: "medium",
	language: "en",
	category: "en-general",
	board_type: "latest",

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) return null;

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const heat_raw = parseHeat(entry.clapCount)[1];
		const heat = formatClaps(entry.clapCount);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: cleanText(entry.url),
			heat,
			heat_raw,
			summary: cleanText(entry.subtitle),
			tags: toArray(entry.tags),
		};
	},
});
