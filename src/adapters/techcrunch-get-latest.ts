import { defineAdapter } from "./factory.js";
import { cleanText, generateId } from "./utils.js";

export default defineAdapter({
	command: "techcrunch/get-latest",
	platform: "techcrunch",
	language: "en",
	category: "en-ai",
	board_type: "latest",

	variant(_raw, data) {
		return (data.category as string | undefined) ?? "_";
	},

	items(_raw, data) {
		return (data.articles as unknown[] | undefined) ?? [];
	},

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) return null;

		return {
			id: generateId(context.platform, context.variant, null, title),
			rank: null,
			title,
			url: cleanText(entry.url),
			heat: null,
			heat_raw: null,
			summary: cleanText(entry.excerpt),
			tags: [],
		};
	},
});
