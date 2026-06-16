import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { commandToModule } from "../../../src/adapters/index.js";
import { BOARD_TYPE_VALUES, CATEGORY_VALUES } from "../../../src/types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPECTED_COMMANDS = [
	"baidu/get-hot",
	"bilibili/get-hot",
	"douyin/get-hot",
	"github/get-trending",
	"hackernews/get-top",
	"google/get-trending",
	"huggingface/get-trending",
	"huggingface/get-papers",
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

const VALID_CATEGORIES = new Set(CATEGORY_VALUES);
const VALID_BOARD_TYPES = new Set(BOARD_TYPE_VALUES);

describe("adapter structure", () => {
	const adapterDir = path.join(__dirname, "..", "..", "..", "src", "adapters");

	it("has TypeScript files for all expected commands", () => {
		const files = new Set(readdirSync(adapterDir));
		for (const command of EXPECTED_COMMANDS) {
			const moduleName = commandToModule(command);
			expect(files.has(`${moduleName}.ts`)).toBe(true);
		}
	});

	it.each(EXPECTED_COMMANDS)("%s exports required constants and normalize", async (command) => {
		const moduleName = commandToModule(command);
		const mod = await import(path.join(adapterDir, `${moduleName}.ts`));
		const adapter = mod.default ?? mod;

		expect(adapter.PLATFORM).toBeTruthy();
		expect(adapter.LANGUAGE).toBeTruthy();
		expect(adapter.CATEGORY).toBeTruthy();
		expect(adapter.BOARD_TYPE).toBeTruthy();
		expect(typeof adapter.normalize).toBe("function");
	});

	it.each(EXPECTED_COMMANDS)("%s has valid category and board_type", async (command) => {
		const moduleName = commandToModule(command);
		const mod = await import(path.join(adapterDir, `${moduleName}.ts`));
		const adapter = mod.default ?? mod;

		expect(VALID_CATEGORIES.has(adapter.CATEGORY)).toBe(true);
		expect(VALID_BOARD_TYPES.has(adapter.BOARD_TYPE)).toBe(true);
	});
});
