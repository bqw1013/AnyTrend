import { defineAdapter } from "./factory.js";
import { cleanText, generateId } from "./utils.js";

function extractTagNames(tags: unknown): string[] {
	if (!Array.isArray(tags)) return [];
	const names: string[] = [];
	for (const tag of tags) {
		if (tag && typeof tag === "object") {
			const name = cleanText((tag as Record<string, unknown>).name);
			if (name) names.push(name);
		}
	}
	return names;
}

export default defineAdapter({
	command: "qbitai/get-latest",
	platform: "qbitai",
	language: "zh",
	category: "zh-ai",
	board_type: "latest",

	items(_raw, data) {
		return (data.articles as unknown[] | undefined) ?? [];
	},

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) return null;

		let rank = typeof entry.rank === "number" ? entry.rank : null;
		if (rank === null) {
			rank = context.index + 1;
		}

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: cleanText(entry.url),
			heat: null,
			heat_raw: null,
			summary: cleanText(entry.summary),
			tags: extractTagNames(entry.tags),
		};
	},
});
