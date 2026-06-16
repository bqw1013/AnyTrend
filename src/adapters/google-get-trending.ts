import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat, toArray } from "./utils.js";

function percentEncode(char: string): string {
	return new TextEncoder()
		.encode(char)
		.reduce((acc, byte) => `${acc}%${byte.toString(16).toUpperCase().padStart(2, "0")}`, "");
}

function percentEncodeQuery(text: string): string {
	const safe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-~/";
	return Array.from(text)
		.map((char) => (safe.includes(char) ? char : percentEncode(char)))
		.join("");
}

function buildUrl(title: unknown): string | null {
	if (title === null || title === undefined) {
		return null;
	}
	const text = String(title).trim();
	if (!text) {
		return null;
	}
	return `https://www.google.com/search?q=${percentEncodeQuery(text)}`;
}

function buildSummary(item: Record<string, unknown>): string | null {
	const parts: string[] = [];
	const timeAgo = cleanText(item.timeAgo);
	const changePct = cleanText(item.changePct);

	if (timeAgo) {
		parts.push(timeAgo);
	}
	if (changePct) {
		parts.push(`增长 ${changePct}`);
	}

	if (!parts.length) {
		return null;
	}
	return parts.join(" · ");
}

export default defineAdapter({
	command: "google/get-trending",
	platform: "google",
	language: "en",
	category: "en-general",
	board_type: "trending",

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) {
			return null;
		}

		const rank = context.index + 1;
		const [heat, heatRaw] = parseHeat(entry.searchVolume);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: buildUrl(title),
			heat,
			heat_raw: heatRaw,
			summary: buildSummary(entry),
			tags: toArray(entry.relatedTopics),
		};
	},
});
