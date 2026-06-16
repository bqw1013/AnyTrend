import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat } from "./utils.js";

function extractPostCount(domainContext: unknown): [string | null, number | null] {
	if (typeof domainContext !== "string") {
		return [null, null];
	}

	const match = /([\d.]+)\s*([KMBkmb]?)\s*posts?/.exec(domainContext);
	if (!match) {
		return [null, null];
	}

	const [, numStr, unit] = match;
	const upperUnit = unit ? unit.toUpperCase() : "";
	const text = upperUnit ? `${numStr}${upperUnit} posts` : `${numStr} posts`;
	const [, raw] = parseHeat(text);
	return [text, raw];
}

export default defineAdapter({
	command: "x/get-trending",
	platform: "x",
	language: "en",
	category: "en-general",
	board_type: "trending",

	variant: (_raw, data) => (typeof data.tab === "string" ? data.tab : "_"),

	mapItem(entry, context) {
		const title = cleanText(entry.name);
		if (!title) {
			return null;
		}

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const domainContext = typeof entry.domain_context === "string" ? entry.domain_context : null;
		const [heatText, heatRaw] = extractPostCount(entry.domain_context);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: cleanText(entry.search_url),
			heat: domainContext ?? heatText,
			heat_raw: heatRaw,
			summary: null,
			tags: [],
		};
	},
});
