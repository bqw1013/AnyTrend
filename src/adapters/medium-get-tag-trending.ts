import { defineAdapter } from "./factory.js";
import { cleanText, generateId, toArray } from "./utils.js";

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function toMetric(value: unknown): number {
	if (value === null || value === undefined) {
		return 0;
	}
	const n = Number(value);
	return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function formatHeat(claps: unknown, responses: unknown, minutes: unknown): string {
	return `${toMetric(claps)} claps · ${toMetric(responses)} responses · ${toMetric(minutes)} min read`;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export default defineAdapter({
	command: "medium/get-tag-trending",
	platform: "medium",
	language: "en",
	category: "en-general",
	board_type: "trending",

	variant(_, data) {
		const tagObj =
			data.tag && typeof data.tag === "object" && !Array.isArray(data.tag)
				? (data.tag as Record<string, unknown>)
				: {};
		return (tagObj.slug as string | undefined) ?? "_";
	},

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) return null;

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const heat_raw = toMetric(entry.clapCount) || null;
		const heat = formatHeat(entry.clapCount, entry.responseCount, entry.readingTime);

		const subtitle = cleanText(entry.subtitle);
		const summary = subtitle && subtitle !== title && subtitle !== "..." && subtitle !== "…" ? subtitle : null;

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: cleanText(entry.url),
			heat,
			heat_raw,
			summary,
			tags: toArray(entry.tags),
		};
	},
});
