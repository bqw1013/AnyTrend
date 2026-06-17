import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { normalizedOutputSchema } from "../../src/types/schema.js";
import { cleanupTempDir, createTempDir, runNormalizeBatch } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixtureDir = path.join(__dirname, "..", "..", "tests", "fixtures", "adapters");

let currentTempDir: string | null = null;

afterEach(() => {
	if (currentTempDir) {
		cleanupTempDir(currentTempDir);
		currentTempDir = null;
	}
});

function listFixtureFiles(): string[] {
	return readdirSync(fixtureDir).filter((f) => f.endsWith(".json"));
}

describe("normalize batch pipeline", () => {
	it("normalizes all adapter fixtures in a single batch", async () => {
		currentTempDir = createTempDir("anytrend-e2e-batch-");
		const rawDir = path.join(currentTempDir, "raw");
		const outDir = path.join(currentTempDir, "out");
		mkdirSync(rawDir, { recursive: true });

		const fixtures = listFixtureFiles();
		expect(fixtures.length).toBeGreaterThan(0);

		for (const fixture of fixtures) {
			cpSync(path.join(fixtureDir, fixture), path.join(rawDir, fixture));
		}

		await runNormalizeBatch({ input: rawDir, output: outDir });

		for (const fixture of fixtures) {
			const outputPath = path.join(outDir, fixture);
			expect(existsSync(outputPath)).toBe(true);

			const output = JSON.parse(readFileSync(outputPath, "utf-8"));
			const parsed = normalizedOutputSchema.safeParse(output);
			expect(parsed.success, `${fixture}: ${parsed.error?.toString() ?? "unknown schema error"}`).toBe(true);
		}
	});

	it("empty input directory returns exit code 0", () => {
		currentTempDir = createTempDir("anytrend-e2e-empty-");
		const rawDir = path.join(currentTempDir, "raw");
		const outDir = path.join(currentTempDir, "out");
		mkdirSync(rawDir, { recursive: true });

		const result = spawnSync("npx", ["tsx", "src/cli.ts", "normalize-batch", "--input", rawDir, "--output", outDir], {
			encoding: "utf-8",
			timeout: 30_000,
			shell: process.platform === "win32",
		});

		expect(result.status).toBe(0);
		expect(result.stdout).toContain("No JSON files found");
	});

	it("all files failing returns exit code 1", () => {
		currentTempDir = createTempDir("anytrend-e2e-fail-");
		const rawDir = path.join(currentTempDir, "raw");
		const outDir = path.join(currentTempDir, "out");
		mkdirSync(rawDir, { recursive: true });

		// Create JSON files with no "command" field — these will all fail
		for (let i = 0; i < 3; i++) {
			writeFileSync(path.join(rawDir, `bad-${i}.json`), JSON.stringify({ title: "no command field" }), "utf-8");
		}

		const result = spawnSync("npx", ["tsx", "src/cli.ts", "normalize-batch", "--input", rawDir, "--output", outDir], {
			encoding: "utf-8",
			timeout: 30_000,
			shell: process.platform === "win32",
		});

		expect(result.status).toBe(1);
		expect(result.stdout).toContain("Done. Success: 0");
	});
});
