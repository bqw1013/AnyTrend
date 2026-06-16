import { describe, expect, it } from "vitest";

// argsToRecord is not exported; test mergeNormalized behavior via a lightweight import.
// We keep this file as a placeholder for future public helpers.

describe("merge-normalized placeholder", () => {
	it("loads the module", async () => {
		const mod = await import("../../src/scripts/merge-normalized.js");
		expect(mod.mergeNormalized).toBeTypeOf("function");
	});
});
