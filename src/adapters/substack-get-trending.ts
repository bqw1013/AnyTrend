import { defineAdapter } from "./factory.js";
import { cleanText, generateId, parseHeat, toArray } from "./utils.js";

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function percentEncode(char: string): string {
	return new TextEncoder()
		.encode(char)
		.reduce((acc, byte) => `${acc}%${byte.toString(16).toUpperCase().padStart(2, "0")}`, "");
}

function quote(text: string): string {
	const safe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-~/";
	return Array.from(text)
		.map((char) => (safe.includes(char) ? char : percentEncode(char)))
		.join("");
}

function buildTopicUrl(query: unknown): string | null {
	if (query === null || query === undefined) {
		return null;
	}
	const text = cleanText(query);
	if (!text) {
		return null;
	}
	return `https://substack.com/search?q=${quote(text)}`;
}

function buildLeaderboardUrl(item: Record<string, unknown>): string | null {
	const publication = (item.publication as Record<string, unknown> | undefined) || {};
	const subdomain = cleanText(publication.subdomain);
	if (subdomain) {
		return `https://${subdomain}.substack.com`;
	}

	const handle = cleanText(item.handle);
	if (handle) {
		return `https://substack.com/@${handle}`;
	}

	return null;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export default defineAdapter({
	command: "substack/get-trending",
	platform: "substack",
	language: "en",
	category: "en-general",
	board_type: "trending",

	items(_, data) {
		if ("trendingTopics" in data) {
			return (data.trendingTopics as unknown[]) ?? [];
		}
		if ("leaderboard" in data) {
			return (data.leaderboard as unknown[]) ?? [];
		}
		return [];
	},

	mapItem(entry, context) {
		if ("query" in entry) {
			// --- trending topic ---
			const title = cleanText(entry.title);
			if (!title) return null;

			const rank = null;
			const category = cleanText(entry.category);
			const predictionMarket = (entry.predictionMarket as Record<string, unknown> | undefined) || {};
			const confidence = predictionMarket.confidence;

			let heat: string | null;
			let heat_raw: number | null;

			if (confidence !== null && confidence !== undefined) {
				const confidenceNum = Math.trunc(Number(confidence));
				heat = category ? `${category} (confidence: ${confidenceNum}%)` : `confidence: ${confidenceNum}%`;
				heat_raw = confidenceNum;
			} else if (category) {
				heat = category;
				heat_raw = null;
			} else {
				heat = null;
				heat_raw = null;
			}

			const tags = toArray(category);
			if (entry.is_currently_happening) {
				tags.push("happening");
			}

			return {
				id: generateId(context.platform, "topic", rank, title),
				rank,
				title,
				url: buildTopicUrl(entry.query),
				heat,
				heat_raw,
				summary: cleanText(entry.long_description) ?? cleanText(entry.description),
				tags,
			};
		}

		// --- leaderboard entry ---
		const publication = (entry.publication as Record<string, unknown> | undefined) || {};
		const title = cleanText(publication.name) ?? cleanText(entry.name);
		if (!title) return null;

		const rank = typeof entry.rank === "number" ? entry.rank : null;
		const ranking = cleanText(entry.ranking);
		const bestsellerTier = entry.bestsellerTier;

		let heat: string | null;
		if (ranking && bestsellerTier !== null && bestsellerTier !== undefined) {
			heat = `${ranking} · bestsellerTier ${bestsellerTier}`;
		} else if (ranking) {
			heat = ranking;
		} else if (rank !== null && rank !== undefined) {
			heat = `Top ${rank}`;
		} else {
			heat = null;
		}

		const [, heat_raw] = parseHeat(rank);

		return {
			id: generateId(context.platform, ranking ?? "leaderboard", rank, title),
			rank,
			title,
			url: buildLeaderboardUrl(entry),
			heat,
			heat_raw,
			summary: cleanText(entry.bio),
			tags: toArray(ranking),
		};
	},
});
