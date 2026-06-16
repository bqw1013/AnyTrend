import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat, parseNumber, toArray } from "./utils.js";

function formatStars(n: number | null | undefined): string | null {
	if (n === null || n === undefined) {
		return null;
	}
	if (n >= 1_000_000) {
		return `${(n / 1_000_000).toFixed(1)}M stars`.replace(".0M", "M");
	}
	if (n >= 1_000) {
		return `${(n / 1_000).toFixed(1)}k stars`.replace(".0k", "k");
	}
	return `${n} stars`;
}

export default defineAdapter({
	command: "github/get-trending",
	platform: "github",
	language: "en",
	category: "en-ai",
	board_type: "trending",

	variant: (_raw, data) => (typeof data.period === "string" ? data.period : "_"),

	items: (_raw, data) => (data.repositories as unknown[] | undefined) ?? [],

	mapItem(entry, context) {
		const title = cleanText(entry.full_name) ?? cleanText(entry.name);
		if (!title) {
			return null;
		}

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const stars = typeof entry.stars === "number" ? entry.stars : parseNumber(entry.stars);
		const [, heatRaw] = parseHeat(entry.stars);
		const heat = formatStars(stars);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: cleanText(entry.url),
			heat,
			heat_raw: heatRaw,
			summary: cleanText(entry.description),
			tags: toArray(entry.language),
		};
	},
});
