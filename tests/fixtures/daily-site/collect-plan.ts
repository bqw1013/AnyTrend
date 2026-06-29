/**
 * Minimal collect plan stub used by Daily Site aggregation integration tests.
 */

export interface CollectCall {
	command: string;
	platform: string;
	args: string[];
	angle: string;
	outputName: string;
	requiresBrowser: boolean;
	requiresLogin: boolean;
}

export const COLLECT_PLAN: CollectCall[] = [
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
		command: "hackernews/get-top",
		platform: "hackernews",
		args: ["--limit", "30", "--sortBy", "points"],
		angle: "HackerNews Top by Points",
		outputName: "hackernews-get-top-points",
		requiresBrowser: false,
		requiresLogin: false,
	},
];
