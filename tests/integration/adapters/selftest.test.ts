import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { adapterOutputSchema } from "../../../src/types/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixtureDir = path.join(__dirname, "..", "..", "fixtures", "adapters");
const adapterDir = path.join(__dirname, "..", "..", "..", "src", "adapters");

function listFixtureNames(): string[] {
	const files = readdirSync(fixtureDir);
	return files
		.filter((f) => f.endsWith(".json"))
		.map((f) => f.replace(/\.json$/, ""))
		.sort();
}

describe("adapter self tests (fixture-based)", () => {
	const names = listFixtureNames();

	it("has at least one fixture", () => {
		expect(names.length).toBeGreaterThan(0);
	});

	it.each(names)("%s fixture produces valid schema output", async (name) => {
		const fixturePath = path.join(fixtureDir, `${name}.json`);
		const fixture = JSON.parse(readFileSync(fixturePath, "utf-8"));

		const adapterPath = path.join(adapterDir, `${name}.ts`);
		const adapterUrl = pathToFileURL(adapterPath).href;
		const adapter = (await import(adapterUrl)) as { default: { normalize: (raw: unknown) => unknown } };

		expect(typeof adapter.default.normalize).toBe("function");

		const output = adapter.default.normalize(fixture);
		const parsed = adapterOutputSchema.safeParse(output);

		expect(parsed.success, parsed.error?.toString() ?? "unknown schema error").toBe(true);
	});
});
