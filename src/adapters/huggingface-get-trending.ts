import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat, toArray } from "./utils.js";

function itemKind(url: string | null): "model" | "dataset" | "space" {
	if (!url) {
		return "model";
	}
	if (url.includes("/datasets/")) {
		return "dataset";
	}
	if (url.includes("/spaces/")) {
		return "space";
	}
	return "model";
}

export default defineAdapter({
	command: "huggingface/get-trending",
	platform: "huggingface",
	language: "en",
	category: "en-ai",
	board_type: "trending",

	variant: (_raw, data) => {
		if (typeof data.type === "string") {
			return data.type;
		}
		const items = Array.isArray(data.items) ? data.items : [];
		if (items.length > 0 && typeof items[0] === "object" && items[0] !== null) {
			const firstUrl = cleanText((items[0] as Record<string, unknown>).url);
			return itemKind(firstUrl);
		}
		return "_";
	},

	items: (raw, data) => {
		if (
			data &&
			typeof data === "object" &&
			!Array.isArray(data) &&
			Array.isArray((data as Record<string, unknown>).items)
		) {
			return (data as Record<string, unknown>).items as unknown[];
		}
		if (Array.isArray(raw.data)) {
			return raw.data as unknown[];
		}
		return [];
	},

	mapItem(entry, context) {
		const title = cleanText(entry.name);
		if (!title) {
			return null;
		}

		const url = cleanText(entry.url);
		const kind = itemKind(url);

		let rank = typeof entry.rank === "number" ? entry.rank : null;
		if (rank === null) {
			rank = context.index + 1;
		}

		const heatValue = kind === "space" ? entry.likes : entry.downloads;
		const heatUnit = kind === "space" ? "likes" : "downloads";

		const [, heatRaw] = parseHeat(heatValue);
		const heat = heatRaw === null ? null : `${heatRaw.toLocaleString("en-US")} ${heatUnit}`;

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url,
			heat,
			heat_raw: heatRaw,
			summary: null,
			tags: toArray(entry.type),
		};
	},
});
