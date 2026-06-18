function rand(min, max) {
	return Math.random() * (max - min) + min;
}

async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function smallHumanPause(page) {
	// Small random mouse move
	const x = Math.floor(rand(50, 300));
	const y = Math.floor(rand(100, 400));
	await page.mouse.move(x, y);

	// Random short pause
	await sleep(rand(150, 600));
}

async function humanLikeDelay(page) {
	await smallHumanPause(page);

	// Smooth scroll a small amount if useful
	const scrollTop = Math.floor(rand(-80, 200));
	if (scrollTop !== 0) {
		await page.evaluate(top => window.scrollBy({ top, behavior: "smooth" }), scrollTop);
		await sleep(rand(200, 800));
	}

	// Final random wait up to 3s
	await sleep(rand(500, 3000));
}

export default async (page, params) => {
	const tab = params.tab;
	const type = tab === "explore" ? "base" : "category";

	let url = `https://substack.com/api/v1/search/explore/web?tab=${encodeURIComponent(tab)}&type=${encodeURIComponent(type)}`;
	if (params.cursor) {
		url += `&cursor=${encodeURIComponent(params.cursor)}`;
	}

	await page.goto(url, { waitUntil: "domcontentloaded" });

	// Brief human-like pause before reading the rendered JSON body
	await smallHumanPause(page);

	const bodyText = await page.evaluate(() => document.body.innerText);
	let result;
	try {
		result = JSON.parse(bodyText);
	} catch {
		const err = new Error("[API_ERROR] Failed to parse Substack API response as JSON");
		err.code = "API_ERROR";
		throw err;
	}

	if (type === "base") {
		const trendingItem = result.items?.find(i => i.type === "trendingTopicsExplore");
		const topics = trendingItem?.suggestedSearches || [];
		const featured = trendingItem?.featuredTopic || null;

		const data = {
			trendingTopics: topics.map(t => ({
				query: t.query,
				title: t.title,
				description: t.description,
				push_title: t.push_title,
				push_subtitle: t.push_subtitle,
				category: t.category,
				long_description: t.long_description,
				photoUrl: t.photoUrl,
				predictionMarket: t.predictionMarket || null,
				is_neutral_topic: t.is_neutral_topic,
				is_currently_happening: t.is_currently_happening,
				id: t.id,
				firstTrendingAt: t.firstTrendingAt,
				recentUsers: (t.recentUsers || []).map(u => ({
					user_id: u.user_id,
					name: u.name,
					photo_url: u.photo_url
				}))
			})),
			featuredTopic: featured ? {
				query: featured.query,
				title: featured.title,
				description: featured.description,
				category: featured.category,
				long_description: featured.long_description,
				photoUrl: featured.photoUrl,
				predictionMarket: featured.predictionMarket || null,
				is_currently_happening: featured.is_currently_happening,
				firstTrendingAt: featured.firstTrendingAt,
				recentUsers: (featured.recentUsers || []).map(u => ({
					user_id: u.user_id,
					name: u.name,
					photo_url: u.photo_url
				}))
			} : null,
			nextCursor: result.nextCursor || null,
			tabs: (result.tabs || []).map(t => ({
				id: t.id,
				name: t.name,
				type: t.type,
				slug: t.slug || null
			}))
		};

		await humanLikeDelay(page);
		return data;
	}

	const leaderboardItem = result.items?.find(i => i.type === "categoryLeaderboard");
	const profiles = leaderboardItem?.profiles || [];

	const data = {
		leaderboard: profiles.map(p => ({
			rank: p.status?.leaderboard?.rank || null,
			ranking: p.status?.leaderboard?.ranking || null,
			name: p.name,
			handle: p.handle,
			bio: p.bio || "",
			photoUrl: p.photo_url,
			bestsellerTier: p.bestseller_tier || 0,
			publication: p.primary_publication ? {
				id: p.primary_publication.id,
				name: p.primary_publication.name,
				subdomain: p.primary_publication.subdomain,
				logoUrl: p.primary_publication.logo_url
			} : null
		})),
		tabs: (result.tabs || []).map(t => ({
			id: t.id,
			name: t.name,
			type: t.type,
			slug: t.slug || null
		}))
	};

	await humanLikeDelay(page);
	return data;
};
