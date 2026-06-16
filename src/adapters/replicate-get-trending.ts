import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat } from "./utils.js";

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export default defineAdapter({
	command: "replicate/get-trending",
	platform: "replicate",
	language: "en",
	category: "en-ai",
	board_type: "trending",

	variant(_, data) {
		const sections = Array.isArray(data.sections) ? data.sections : [];
		for (const section of sections) {
			if (!section || typeof section !== "object") continue;
			const models = (section as Record<string, unknown>).models;
			if (Array.isArray(models) && models.length > 0) {
				return cleanText((section as Record<string, unknown>).name) ?? "_";
			}
		}
		return "_";
	},

	items(_, data) {
		const sections = Array.isArray(data.sections) ? data.sections : [];
		const flattened: unknown[] = [];
		for (const section of sections) {
			if (!section || typeof section !== "object") continue;
			const models = (section as Record<string, unknown>).models;
			if (Array.isArray(models)) {
				for (const model of models) {
					flattened.push(model);
				}
			}
		}
		return flattened;
	},

	mapItem(entry, context) {
		const title = cleanText(entry.displayName) ?? cleanText(entry.name);
		if (!title) return null;

		const rank = context.index + 1;
		const [heat, heat_raw] = parseHeat(entry.runs);

		return {
			id: generateId(context.platform, context.variant, rank, title),
			rank,
			title,
			url: cleanText(entry.url),
			heat,
			heat_raw,
			summary: cleanText(entry.description),
			tags: [],
		};
	},
});
