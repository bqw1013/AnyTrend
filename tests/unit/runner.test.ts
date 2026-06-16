import { describe, expect, it } from "vitest";
import { getYesterdayPt, resolveArgs } from "../../src/lib/runner.js";

describe("resolveArgs", () => {
	it("replaces yesterday_pt placeholder", () => {
		const args = ["--date", "{{yesterday_pt}}", "--limit", "20"];
		const resolved = resolveArgs(args);
		expect(resolved[0]).toBe("--date");
		expect(resolved[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(resolved[2]).toBe("--limit");
		expect(resolved[3]).toBe("20");
	});

	it("leaves literal args unchanged", () => {
		const args = ["--tab", "realtime", "--limit", "50"];
		expect(resolveArgs(args)).toEqual(args);
	});
});

describe("getYesterdayPt", () => {
	it("returns a YYYY-MM-DD string", () => {
		expect(getYesterdayPt()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});
