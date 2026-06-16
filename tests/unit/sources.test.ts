import { describe, expect, it } from "vitest";
import { formatSourcesTable } from "../../src/lib/sources.js";

describe("formatSourcesTable", () => {
	it("returns a non-empty string", () => {
		const output = formatSourcesTable({ useColor: false });
		expect(output).toBeTruthy();
		expect(typeof output).toBe("string");
	});

	it("includes headers", () => {
		const output = formatSourcesTable({ useColor: false });
		expect(output).toContain("Command");
		expect(output).toContain("Angle");
		expect(output).toContain("Browser");
		expect(output).toContain("Login");
	});

	it("includes total count", () => {
		const output = formatSourcesTable({ useColor: false });
		expect(output).toMatch(/Total: \d+ sources/);
	});

	it("includes browser and login required counts", () => {
		const output = formatSourcesTable({ useColor: false });
		expect(output).toMatch(/Browser required: \d+/);
		expect(output).toMatch(/Login required: \d+/);
	});

	it("with useColor=true does not throw", () => {
		expect(() => formatSourcesTable({ useColor: true })).not.toThrow();
	});

	it("with default options does not throw", () => {
		expect(() => formatSourcesTable()).not.toThrow();
	});
});
