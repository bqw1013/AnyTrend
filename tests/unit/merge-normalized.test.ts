import { describe, expect, it } from "vitest";

describe("merge-normalized", () => {
	it("exports runMerge", async () => {
		const mod = await import("../../src/lib/merge-normalized.js");
		expect(mod.runMerge).toBeTypeOf("function");
	});

	it("exports type interfaces", async () => {
		const mod = await import("../../src/lib/merge-normalized.js");
		// Type exports exist (can't test at runtime, but module loads)
		expect(mod).toBeDefined();
	});
});
