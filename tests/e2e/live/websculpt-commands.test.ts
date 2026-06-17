import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import { normalizedOutputSchema } from "../../../src/types/schema.js";
import { commandToFilename, runNormalize, runWebsculpt, runWithConcurrency } from "../utils.js";

const runE2eLive = process.env.RUN_E2E_LIVE === "1";
const describeOrSkip = runE2eLive ? describe : describe.skip;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawDir = path.join(__dirname, "..", "..", "..", "anytrend-data", "raw", "e2e");
const normalizedDir = path.join(__dirname, "..", "..", "..", "anytrend-data", "normalized", "e2e");

const COMMANDS = [
	"baidu/get-hot",
	"bilibili/get-hot",
	"douyin/get-hot",
	"github/get-trending",
	"google/get-trending",
	"hackernews/get-top",
	"huggingface/get-papers",
	"huggingface/get-trending",
	"jike/get-hot",
	"jiqizhixin/get-latest",
	"juejin/get-hot",
	"lobsters/get-hot",
	"maimai/get-hot",
	"medium/get-staff-picks",
	"medium/get-tag-trending",
	"producthunt/get-trending",
	"qbitai/get-latest",
	"reddit/get-hot",
	"replicate/get-trending",
	"substack/get-trending",
	"techcrunch/get-latest",
	"toutiao/get-hot",
	"weibo/get-hot-search",
	"x/get-trending",
	"xiaohongshu/get-feed",
	"youtube/get-feed",
	"zhihu/get-hot",
];

const COMMAND_ARGS: Record<string, string[]> = {
	"medium/get-tag-trending": ["--tag", "technology"],
	"toutiao/get-hot": ["--channel", "热点"],
};

const LONG_TIMEOUT_COMMANDS = new Set([
	"douyin/get-hot",
	"google/get-trending",
	"huggingface/get-papers",
	"huggingface/get-trending",
	"jike/get-hot",
	"jiqizhixin/get-latest",
	"lobsters/get-hot",
	"maimai/get-hot",
	"medium/get-staff-picks",
	"medium/get-tag-trending",
	"producthunt/get-trending",
	"qbitai/get-latest",
	"reddit/get-hot",
	"replicate/get-trending",
	"substack/get-trending",
	"toutiao/get-hot",
	"x/get-trending",
	"xiaohongshu/get-feed",
	"youtube/get-feed",
	"zhihu/get-hot",
]);

function getTimeout(command: string): number {
	return LONG_TIMEOUT_COMMANDS.has(command) ? 120_000 : 60_000;
}

function groupByPlatform(commands: string[]): Map<string, string[]> {
	const groups = new Map<string, string[]>();
	for (const command of commands) {
		const platform = command.split("/")[0];
		if (!platform) {
			throw new Error(`Invalid command without platform: ${command}`);
		}
		const existing = groups.get(platform);
		if (existing) {
			existing.push(command);
		} else {
			groups.set(platform, [command]);
		}
	}
	return groups;
}

interface WebsculptRaw {
	success?: boolean;
	error?: { message?: string } | string | unknown;
}

function getRawErrorMessage(raw: WebsculptRaw): string {
	const error = raw.error;
	if (typeof error === "string") {
		return error;
	}
	if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
		return error.message;
	}
	return "raw.success is not true";
}

describeOrSkip("live WebSculpt commands", () => {
	beforeAll(() => {
		rmSync(rawDir, { recursive: true, force: true });
		rmSync(normalizedDir, { recursive: true, force: true });
		mkdirSync(rawDir, { recursive: true });
		mkdirSync(normalizedDir, { recursive: true });
	});

	test("all commands produce valid normalized output", async () => {
		const groups = groupByPlatform(COMMANDS);
		const failures: string[] = [];

		await runWithConcurrency(Array.from(groups.entries()), 6, async ([platform, commands]) => {
			for (const command of commands) {
				try {
					const timeout = getTimeout(command);
					const { raw } = await runWebsculpt(command, { timeoutMs: timeout, args: COMMAND_ARGS[command] });
					const rawTyped = raw as WebsculptRaw;
					const filename = commandToFilename(command);
					const rawPath = path.join(rawDir, filename);
					const normalizedPath = path.join(normalizedDir, filename);

					writeFileSync(rawPath, JSON.stringify(raw, null, 2));
					await runNormalize({ input: rawPath, output: normalizedPath });
					const normalizedOutput = JSON.parse(readFileSync(normalizedPath, "utf-8")) as unknown;

					if (rawTyped.success !== true) {
						const message = getRawErrorMessage(rawTyped);
						failures.push(`[${platform}] ${command}: ${message}`);
						continue;
					}

					const parsed = normalizedOutputSchema.safeParse(normalizedOutput);
					if (!parsed.success) {
						failures.push(`[${platform}] ${command}: ${parsed.error.message}`);
						continue;
					}

					if (parsed.data.items.length === 0) {
						failures.push(`[${platform}] ${command}: normalized items array is empty`);
					}
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					failures.push(`[${platform}] ${command}: ${message}`);
				}
			}
		});

		expect(failures).toEqual([]);
	});
});
