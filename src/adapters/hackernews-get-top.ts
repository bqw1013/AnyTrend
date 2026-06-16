import { defineAdapter } from "./factory.js";
import { cleanText, generateId } from "./utils.js";

export default defineAdapter({
	command: "hackernews/get-top",
	platform: "hackernews",
	language: "en",
	category: "en-general",
	board_type: "top",

	items(raw) {
		return Array.isArray(raw.data) ? raw.data : [];
	},

	mapItem(entry, context) {
		const title = cleanText(entry.title);
		if (!title) return null;

		const rank = typeof entry.rank === "number" ? entry.rank : null;

		const rawUrl = entry.url || entry.hnUrl;
		const url = cleanText(rawUrl);

		let heat: string | null = null;
		let heat_raw: number | null = null;

		const points = entry.points;
		if (points !== null && points !== undefined) {
			const numComments = entry.numComments;
			if (numComments !== null && numComments !== undefined) {
				heat = `${points} points · ${numComments} comments`;
			} else {
				heat = `${points} points`;
			}
			heat_raw = typeof points === "number" ? Math.trunc(points) : null;
		}

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url,
			heat,
			heat_raw,
			summary: null,
			tags: [],
		};
	},
});
