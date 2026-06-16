import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { normalizedOutputSchema } from "../../src/types/schema.js";
import { cleanupTempDir, commandToFilename, createTempDir, getProjectVersion, runNormalize } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixtureDir = path.join(__dirname, "..", "..", "tests", "fixtures", "adapters");
const e2eFixtureDir = path.join(__dirname, "..", "..", "tests", "fixtures", "e2e");

interface FixtureMeta {
	command: string;
}

let currentTempDir: string | null = null;

afterEach(() => {
	if (currentTempDir) {
		cleanupTempDir(currentTempDir);
		currentTempDir = null;
	}
});

function listAdapterFixtures(): { filename: string; command: string }[] {
	const files = readdirSync(fixtureDir).filter((f) => f.endsWith(".json"));
	return files.map((filename) => {
		const fixturePath = path.join(fixtureDir, filename);
		const fixture = JSON.parse(readFileSync(fixturePath, "utf-8")) as FixtureMeta;
		return { filename, command: fixture.command };
	});
}

describe("normalize pipeline", () => {
	it.each(listAdapterFixtures())("normalizes $filename", async ({ filename, command }) => {
		const fixturePath = path.join(fixtureDir, filename);
		currentTempDir = createTempDir("anytrend-e2e-normalize-");
		const outputPath = path.join(currentTempDir, commandToFilename(command));

		await runNormalize({ input: fixturePath, output: outputPath });

		expect(existsSync(outputPath)).toBe(true);

		const output = JSON.parse(readFileSync(outputPath, "utf-8"));
		const parsed = normalizedOutputSchema.safeParse(output);
		expect(parsed.success, parsed.error?.toString() ?? "unknown schema error").toBe(true);

		if (!parsed.success) {
			return;
		}

		expect(parsed.data.version).toBe(getProjectVersion());
		expect(parsed.data.command).toBe(command);
		expect(typeof parsed.data.generated_at).toBe("string");
		expect(parsed.data.generated_at.length).toBeGreaterThan(0);
		expect(parsed.data.items.length).toBeGreaterThan(0);
	});
});

describe("toutiao dynamic board_type", () => {
	it("produces hot-search for ranked items and feed for feed items", async () => {
		currentTempDir = createTempDir("anytrend-e2e-toutiao-");

		const hotSearchFixture = path.join(fixtureDir, "toutiao-get-hot.json");
		const hotSearchOutput = path.join(currentTempDir, "toutiao-get-hot.json");
		await runNormalize({ input: hotSearchFixture, output: hotSearchOutput });

		const hotSearchRaw = JSON.parse(readFileSync(hotSearchOutput, "utf-8"));
		const hotSearchParsed = normalizedOutputSchema.safeParse(hotSearchRaw);
		expect(hotSearchParsed.success, hotSearchParsed.error?.toString() ?? "unknown schema error").toBe(true);
		if (!hotSearchParsed.success) {
			return;
		}
		expect(hotSearchParsed.data.board_type).toBe("hot-search");

		const feedFixture = path.join(e2eFixtureDir, "toutiao-get-hot-feed.json");
		const feedOutput = path.join(currentTempDir, "toutiao-get-hot-feed.json");
		await runNormalize({ input: feedFixture, output: feedOutput });

		const feedRaw = JSON.parse(readFileSync(feedOutput, "utf-8"));
		const feedParsed = normalizedOutputSchema.safeParse(feedRaw);
		expect(feedParsed.success, feedParsed.error?.toString() ?? "unknown schema error").toBe(true);
		if (!feedParsed.success) {
			return;
		}
		expect(feedParsed.data.board_type).toBe("feed");
	});
});
