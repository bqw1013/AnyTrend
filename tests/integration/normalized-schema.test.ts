import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { normalizedOutputSchema } from "../../src/types/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const normalizedDir = path.join(__dirname, "..", "..", "data", "normalized");

function* walkNormalizedFiles(dir: string): Generator<string> {
	for (const entry of readdirSync(dir)) {
		const fullPath = path.join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			yield* walkNormalizedFiles(fullPath);
		} else if (entry.endsWith(".json")) {
			yield fullPath;
		}
	}
}

describe("normalized schema validation", () => {
	it("validates all normalized JSON files", () => {
		const errors: string[] = [];

		for (const filePath of walkNormalizedFiles(normalizedDir)) {
			try {
				const content = readFileSync(filePath, "utf-8");
				const data = JSON.parse(content);
				const parsed = normalizedOutputSchema.safeParse(data);
				if (!parsed.success) {
					errors.push(`${path.relative(normalizedDir, filePath)}: ${parsed.error.message}`);
				}
			} catch (err) {
				errors.push(
					`${path.relative(normalizedDir, filePath)}: invalid JSON - ${
						err instanceof Error ? err.message : String(err)
					}`,
				);
			}
		}

		expect(errors).toEqual([]);
	});
});
