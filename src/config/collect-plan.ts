/**
 * Daily collection plan for AnyTrend.
 *
 * Each entry defines one websculpt invocation. Calls are grouped by platform
 * and executed sequentially within a platform to avoid anti-scraping penalties.
 */

export interface CollectCall {
	/** WebSculpt command, e.g. "baidu/get-hot". */
	command: string;

	/** Platform identifier (first segment of command). Used for grouping. */
	platform: string;

	/** Command-line arguments. Use "{{yesterday_pt}}" for Product Hunt date. */
	args: string[];

	/** Human-readable data angle, used in reports and source metadata. */
	angle: string;

	/** Base filename (without .json) for raw and normalized outputs. */
	outputName: string;

	/** Whether this command requires a browser (Playwright/Chromium). */
	requiresBrowser: boolean;

	/** Whether this command requires a logged-in browser session. */
	requiresLogin: boolean;
}

export const COLLECT_PLAN: CollectCall[] = [
	// 中文综合
	{
		command: "baidu/get-hot",
		platform: "baidu",
		args: ["--tab", "realtime", "--limit", "50"],
		angle: "百度实时热搜",
		outputName: "baidu-get-hot-realtime",
		requiresBrowser: false,
		requiresLogin: false,
	},
	{
		command: "bilibili/get-hot",
		platform: "bilibili",
		args: ["--limit", "10"],
		angle: "Bilibili 热搜",
		outputName: "bilibili-get-hot",
		requiresBrowser: false,
		requiresLogin: false,
	},
	{
		command: "douyin/get-hot",
		platform: "douyin",
		args: ["--type", "video", "--tag", "全部", "--order", "play", "--period", "24h", "--limit", "20"],
		angle: "抖音综合热门视频",
		outputName: "douyin-get-hot-video-all",
		requiresBrowser: true,
		requiresLogin: true,
	},
	{
		command: "douyin/get-hot",
		platform: "douyin",
		args: ["--type", "video", "--tag", "科技", "--order", "hot", "--period", "24h", "--limit", "20"],
		angle: "抖音科技热门视频",
		outputName: "douyin-get-hot-video-tech",
		requiresBrowser: true,
		requiresLogin: true,
	},
	{
		command: "douyin/get-hot",
		platform: "douyin",
		args: ["--type", "hotspot", "--limit", "20"],
		angle: "抖音创作热点",
		outputName: "douyin-get-hot-hotspot",
		requiresBrowser: true,
		requiresLogin: true,
	},
	{
		command: "douyin/get-hot",
		platform: "douyin",
		args: ["--type", "topic", "--limit", "20"],
		angle: "抖音热门话题",
		outputName: "douyin-get-hot-topic",
		requiresBrowser: true,
		requiresLogin: true,
	},
	{
		command: "toutiao/get-hot",
		platform: "toutiao",
		args: ["--channel", "热点", "--limit", "20"],
		angle: "今日头条热点",
		outputName: "toutiao-get-hot-channel-hot",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "toutiao/get-hot",
		platform: "toutiao",
		args: ["--channel", "科技", "--limit", "10"],
		angle: "今日头条科技",
		outputName: "toutiao-get-hot-channel-tech",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "toutiao/get-hot",
		platform: "toutiao",
		args: ["--channel", "财经", "--limit", "10"],
		angle: "今日头条财经",
		outputName: "toutiao-get-hot-channel-finance",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "weibo/get-hot-search",
		platform: "weibo",
		args: ["--limit", "50"],
		angle: "微博热搜",
		outputName: "weibo-get-hot-search",
		requiresBrowser: false,
		requiresLogin: false,
	},
	{
		command: "xiaohongshu/get-feed",
		platform: "xiaohongshu",
		args: ["--category", "推荐", "--limit", "20"],
		angle: "小红书推荐流",
		outputName: "xiaohongshu-get-feed-recommend",
		requiresBrowser: true,
		requiresLogin: true,
	},
	{
		command: "zhihu/get-hot",
		platform: "zhihu",
		args: ["--limit", "30"],
		angle: "知乎热榜",
		outputName: "zhihu-get-hot",
		requiresBrowser: true,
		requiresLogin: true,
	},

	// 英文综合
	{
		command: "reddit/get-hot",
		platform: "reddit",
		args: ["--sort", "hot", "--limit", "15"],
		angle: "Reddit Hot",
		outputName: "reddit-get-hot-hot",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "reddit/get-hot",
		platform: "reddit",
		args: ["--sort", "top", "--limit", "15"],
		angle: "Reddit Top",
		outputName: "reddit-get-hot-top",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "reddit/get-hot",
		platform: "reddit",
		args: ["--sort", "rising", "--limit", "15"],
		angle: "Reddit Rising",
		outputName: "reddit-get-hot-rising",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "hackernews/get-top",
		platform: "hackernews",
		args: ["--limit", "30", "--sortBy", "points"],
		angle: "HackerNews Top by Points",
		outputName: "hackernews-get-top-points",
		requiresBrowser: false,
		requiresLogin: false,
	},
	{
		command: "producthunt/get-trending",
		platform: "producthunt",
		args: ["--date", "{{yesterday_pt}}", "--limit", "20"],
		angle: "Product Hunt 昨日榜单",
		outputName: "producthunt-get-trending-yesterday",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "google/get-trending",
		platform: "google",
		args: ["--geo", "US"],
		angle: "Google Trends US",
		outputName: "google-get-trending-us",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "google/get-trending",
		platform: "google",
		args: ["--geo", "GB"],
		angle: "Google Trends GB",
		outputName: "google-get-trending-gb",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "x/get-trending",
		platform: "x",
		args: ["--tab", "trending", "--limit", "20"],
		angle: "X Trending",
		outputName: "x-get-trending-trending",
		requiresBrowser: true,
		requiresLogin: true,
	},
	{
		command: "x/get-trending",
		platform: "x",
		args: ["--tab", "news", "--limit", "20"],
		angle: "X News",
		outputName: "x-get-trending-news",
		requiresBrowser: true,
		requiresLogin: true,
	},
	{
		command: "youtube/get-feed",
		platform: "youtube",
		args: ["--tab", "全部", "--limit", "20"],
		angle: "YouTube 综合推荐",
		outputName: "youtube-get-feed-all",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "youtube/get-feed",
		platform: "youtube",
		args: ["--tab", "最近上传", "--limit", "15"],
		angle: "YouTube 最近上传",
		outputName: "youtube-get-feed-recent",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "substack/get-trending",
		platform: "substack",
		args: ["--tab", "explore"],
		angle: "Substack Explore",
		outputName: "substack-get-trending-explore",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "substack/get-trending",
		platform: "substack",
		args: ["--tab", "4"],
		angle: "Substack Technology",
		outputName: "substack-get-trending-tech",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "techcrunch/get-latest",
		platform: "techcrunch",
		args: ["--category", "artificial-intelligence", "--per_page", "10"],
		angle: "TechCrunch AI",
		outputName: "techcrunch-get-latest-ai",
		requiresBrowser: false,
		requiresLogin: false,
	},
	{
		command: "techcrunch/get-latest",
		platform: "techcrunch",
		args: ["--category", "startups", "--per_page", "10"],
		angle: "TechCrunch Startups",
		outputName: "techcrunch-get-latest-startups",
		requiresBrowser: false,
		requiresLogin: false,
	},
	{
		command: "techcrunch/get-latest",
		platform: "techcrunch",
		args: ["--category", "venture", "--per_page", "10"],
		angle: "TechCrunch Venture",
		outputName: "techcrunch-get-latest-venture",
		requiresBrowser: false,
		requiresLogin: false,
	},

	// 中文 AI 垂类
	{
		command: "jike/get-hot",
		platform: "jike",
		args: ["--keyword", "AI", "--limit", "20"],
		angle: "即刻 AI 圈子",
		outputName: "jike-get-hot-ai",
		requiresBrowser: true,
		requiresLogin: true,
	},
	{
		command: "jike/get-hot",
		platform: "jike",
		args: ["--keyword", "产品", "--limit", "20"],
		angle: "即刻产品圈子",
		outputName: "jike-get-hot-product",
		requiresBrowser: true,
		requiresLogin: true,
	},
	{
		command: "jike/get-hot",
		platform: "jike",
		args: ["--keyword", "创业", "--limit", "20"],
		angle: "即刻创业圈子",
		outputName: "jike-get-hot-startup",
		requiresBrowser: true,
		requiresLogin: true,
	},
	{
		command: "juejin/get-hot",
		platform: "juejin",
		args: ["--sort_type", "3", "--limit", "20"],
		angle: "稀土掘金热门",
		outputName: "juejin-get-hot-hot",
		requiresBrowser: false,
		requiresLogin: false,
	},
	{
		command: "jiqizhixin/get-latest",
		platform: "jiqizhixin",
		args: ["--limit", "20"],
		angle: "机器之心最新",
		outputName: "jiqizhixin-get-latest",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "qbitai/get-latest",
		platform: "qbitai",
		args: ["--limit", "20"],
		angle: "量子位最新",
		outputName: "qbitai-get-latest",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "maimai/get-hot",
		platform: "maimai",
		args: ["--limit", "15"],
		angle: "脉脉热榜",
		outputName: "maimai-get-hot-rank",
		requiresBrowser: true,
		requiresLogin: true,
	},
	{
		command: "maimai/get-hot",
		platform: "maimai",
		args: ["--query", "AI", "--limit", "20"],
		angle: "脉脉 AI 热帖",
		outputName: "maimai-get-hot-ai",
		requiresBrowser: true,
		requiresLogin: true,
	},
	{
		command: "maimai/get-hot",
		platform: "maimai",
		args: ["--query", "大模型", "--limit", "20"],
		angle: "脉脉大模型热帖",
		outputName: "maimai-get-hot-llm",
		requiresBrowser: true,
		requiresLogin: true,
	},
	{
		command: "maimai/get-hot",
		platform: "maimai",
		args: ["--query", "招聘", "--limit", "20"],
		angle: "脉脉招聘热帖",
		outputName: "maimai-get-hot-jobs",
		requiresBrowser: true,
		requiresLogin: true,
	},

	// 英文 AI 垂类
	{
		command: "github/get-trending",
		platform: "github",
		args: ["--period", "weekly", "--limit", "25"],
		angle: "GitHub Weekly Trending",
		outputName: "github-get-trending-weekly",
		requiresBrowser: false,
		requiresLogin: false,
	},
	{
		command: "github/get-trending",
		platform: "github",
		args: ["--period", "daily", "--limit", "25"],
		angle: "GitHub Daily Trending",
		outputName: "github-get-trending-daily",
		requiresBrowser: false,
		requiresLogin: false,
	},
	{
		command: "github/get-trending",
		platform: "github",
		args: ["--language", "python", "--period", "weekly", "--limit", "15"],
		angle: "GitHub Python Weekly",
		outputName: "github-get-trending-python",
		requiresBrowser: false,
		requiresLogin: false,
	},
	{
		command: "github/get-trending",
		platform: "github",
		args: ["--language", "typescript", "--period", "weekly", "--limit", "15"],
		angle: "GitHub TypeScript Weekly",
		outputName: "github-get-trending-typescript",
		requiresBrowser: false,
		requiresLogin: false,
	},
	{
		command: "huggingface/get-papers",
		platform: "huggingface",
		args: ["--limit", "20"],
		angle: "Hugging Face Papers",
		outputName: "huggingface-get-papers",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "huggingface/get-trending",
		platform: "huggingface",
		args: ["--type", "models", "--sort", "trending", "--limit", "20"],
		angle: "Hugging Face Models Trending",
		outputName: "huggingface-get-trending-models",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "huggingface/get-trending",
		platform: "huggingface",
		args: ["--type", "datasets", "--sort", "trending", "--limit", "10"],
		angle: "Hugging Face Datasets Trending",
		outputName: "huggingface-get-trending-datasets",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "huggingface/get-trending",
		platform: "huggingface",
		args: ["--type", "spaces", "--sort", "trending", "--limit", "10"],
		angle: "Hugging Face Spaces Trending",
		outputName: "huggingface-get-trending-spaces",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "replicate/get-trending",
		platform: "replicate",
		args: ["--sections", "featured", "--limit", "15"],
		angle: "Replicate Featured",
		outputName: "replicate-get-trending-featured",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "replicate/get-trending",
		platform: "replicate",
		args: ["--sections", "latest", "--limit", "15"],
		angle: "Replicate Latest",
		outputName: "replicate-get-trending-latest",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "lobsters/get-hot",
		platform: "lobsters",
		args: ["--sort", "hot", "--limit", "25"],
		angle: "Lobsters Hot",
		outputName: "lobsters-get-hot-hot",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "lobsters/get-hot",
		platform: "lobsters",
		args: ["--sort", "top", "--top_period", "1w", "--limit", "25"],
		angle: "Lobsters Top Weekly",
		outputName: "lobsters-get-hot-top-weekly",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "medium/get-staff-picks",
		platform: "medium",
		args: ["--limit", "20"],
		angle: "Medium Staff Picks",
		outputName: "medium-get-staff-picks",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "medium/get-tag-trending",
		platform: "medium",
		args: ["--tag", "artificial-intelligence", "--limit", "10"],
		angle: "Medium AI Tag",
		outputName: "medium-get-tag-trending-ai",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "medium/get-tag-trending",
		platform: "medium",
		args: ["--tag", "programming", "--limit", "10"],
		angle: "Medium Programming Tag",
		outputName: "medium-get-tag-trending-programming",
		requiresBrowser: true,
		requiresLogin: false,
	},
	{
		command: "medium/get-tag-trending",
		platform: "medium",
		args: ["--tag", "technology", "--limit", "10"],
		angle: "Medium Technology Tag",
		outputName: "medium-get-tag-trending-technology",
		requiresBrowser: true,
		requiresLogin: false,
	},
];

/**
 * Returns the platform (first segment) of a WebSculpt command.
 */
export function getPlatform(command: string): string {
	return command.split("/")[0] ?? command;
}

/**
 * Re-orders calls so that browser and non-browser commands are interleaved.
 * Same-platform calls keep their relative order.
 */
export function interleaveCalls(calls: CollectCall[]): CollectCall[] {
	const browser: CollectCall[] = [];
	const nonBrowser: CollectCall[] = [];

	for (const call of calls) {
		if (call.requiresBrowser) {
			browser.push(call);
		} else {
			nonBrowser.push(call);
		}
	}

	const result: CollectCall[] = [];
	let b = 0;
	let n = 0;

	while (b < browser.length || n < nonBrowser.length) {
		// Alternate to keep the active set mixed.
		if (n < nonBrowser.length) {
			const call = nonBrowser[n];
			if (call) result.push(call);
			n++;
		}
		if (b < browser.length) {
			const call = browser[b];
			if (call) result.push(call);
			b++;
		}
	}

	return result;
}
