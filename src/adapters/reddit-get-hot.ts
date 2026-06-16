import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat } from "./utils.js";

function formatRedditHeat(score: unknown, numComments: unknown): string | null {
	const parts: string[] = [];

	if (typeof score === "number" && !Number.isNaN(score)) {
		const n = Math.trunc(score);
		if (n >= 1_000_000) {
			parts.push(`${(n / 1_000_000).toFixed(1)}M upvotes`.replace(".0M", "M"));
		} else if (n >= 1_000) {
			parts.push(`${(n / 1_000).toFixed(1)}k upvotes`.replace(".0k", "k"));
		} else {
			parts.push(`${n} upvotes`);
		}
	}

	if (typeof numComments === "number" && !Number.isNaN(numComments)) {
		const n = Math.trunc(numComments);
		if (n >= 1_000_000) {
			parts.push(`${(n / 1_000_000).toFixed(1)}M comments`.replace(".0M", "M"));
		} else if (n >= 1_000) {
			parts.push(`${(n / 1_000).toFixed(1)}k comments`.replace(".0k", "k"));
		} else {
			parts.push(`${n} comments`);
		}
	}

	return parts.length > 0 ? parts.join(" · ") : null;
}

export default defineAdapter({
	command: "reddit/get-hot",
	platform: "reddit",
	language: "en",
	category: "en-general",
	board_type: "top",

	variant: (_raw, data) => (typeof data.sort === "string" ? data.sort : "_"),

	items: (_raw, data) => (data.posts as unknown[] | undefined) ?? [],

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) {
			return null;
		}

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const [, heatRaw] = parseHeat(entry.score);
		const heat = formatRedditHeat(entry.score, entry.num_comments);

		let url = cleanText(entry.url);
		if (!url) {
			url = cleanText(entry.permalink);
		}

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url,
			heat,
			heat_raw: heatRaw,
			summary: null,
			tags: [],
		};
	},
});
