import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat, toArray } from "./utils.js";

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function makeTitle(content: string): string {
	const [firstLine = ""] = content.split("\n", 1);
	const trimmedFirstLine = firstLine.trim();
	if (trimmedFirstLine.length >= 8) {
		return trimmedFirstLine;
	}

	let snippet = content.slice(0, 60).trim();
	if (content.length > 60) {
		snippet += "…";
	}
	return snippet;
}

function extractCounts(item: Record<string, unknown>): {
	like: number;
	comment: number;
	repost: number;
	share: number;
} {
	return {
		like: typeof item.like_count === "number" ? item.like_count : 0,
		comment: typeof item.comment_count === "number" ? item.comment_count : 0,
		repost: typeof item.repost_count === "number" ? item.repost_count : 0,
		share: typeof item.share_count === "number" ? item.share_count : 0,
	};
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export default defineAdapter({
	command: "jike/get-hot",
	platform: "jike",
	language: "zh",
	category: "zh-ai",
	board_type: "feed",

	variant(_, data) {
		const topicInfo =
			typeof data.topic === "object" && data.topic !== null ? (data.topic as Record<string, unknown>) : {};
		return cleanText(topicInfo.name) ?? "_";
	},

	mapItem(entry, context) {
		const content = cleanText(entry.content);
		if (!content) return null;

		const title = makeTitle(content as string);
		if (!title) return null;

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const { like, comment, repost, share } = extractCounts(entry);
		const total = like + comment + repost + share;
		const heatText = `${total} 互动（${like} 赞 / ${comment} 评 / ${repost} 转 / ${share} 分）`;
		const [, heatRaw] = parseHeat(total);

		const itemTopic =
			typeof entry.topic === "object" && entry.topic !== null ? (entry.topic as Record<string, unknown>) : {};
		const topicName = cleanText(itemTopic.name);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: cleanText(entry.url),
			heat: heatText,
			heat_raw: heatRaw,
			summary: content,
			tags: toArray(topicName),
		};
	},
});
