import { defineAdapter } from "./factory.js";
import { cleanText, generateId, toArray } from "./utils.js";

function buildArticleUrl(slug: string | null): string | null {
	if (!slug) return null;
	return `https://www.jiqizhixin.com/articles/${slug}`;
}

export default defineAdapter({
	command: "jiqizhixin/get-latest",
	platform: "jiqizhixin",
	language: "zh",
	category: "zh-ai",
	board_type: "latest",

	items(_raw, data) {
		return (data.articles as unknown[] | undefined) ?? [];
	},

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) return null;

		const slug = cleanText(entry.slug);

		return {
			id: generateId(context.platform, context.variant, null, title),
			rank: null,
			title,
			url: buildArticleUrl(slug),
			heat: null,
			heat_raw: null,
			summary: cleanText(entry.content),
			tags: toArray(entry.tagList),
		};
	},
});
