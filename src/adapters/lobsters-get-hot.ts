import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat, toArray } from "./utils.js";

function formatHeat(votes: unknown, commentCount: unknown, timeAgo: string | null): string | null {
	const parts: string[] = [];
	if (votes !== null && votes !== undefined) {
		const n = Number(votes);
		parts.push(`${n} vote${n === 1 ? "" : "s"}`);
	}
	if (commentCount !== null && commentCount !== undefined) {
		const n = Number(commentCount);
		parts.push(`${n} comment${n === 1 ? "" : "s"}`);
	}
	if (timeAgo) {
		parts.push(timeAgo);
	}
	return parts.length > 0 ? parts.join(" · ") : null;
}

export default defineAdapter({
	command: "lobsters/get-hot",
	platform: "lobsters",
	language: "en",
	category: "en-ai",
	board_type: "top",

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) return null;

		const rank = context.index + 1;
		const storyId = cleanText(entry.id);

		let url = cleanText(entry.url);
		if (!url && storyId) {
			url = `https://lobste.rs/s/${storyId}`;
		}

		const timeAgo = cleanText(entry.timeAgo);
		const heat = formatHeat(entry.votes, entry.commentCount, timeAgo);
		const [, heat_raw] = parseHeat(entry.votes);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url,
			heat,
			heat_raw,
			summary: null,
			tags: toArray(entry.tags),
		};
	},
});
