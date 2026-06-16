import { describe, expect, it } from "vitest";
import { COLLECT_PLAN, interleaveCalls } from "../../src/config/collect-plan.js";

describe("interleaveCalls", () => {
	it("alternates browser and non-browser calls", () => {
		const calls = [
			{
				command: "a/x",
				platform: "a",
				args: [],
				angle: "",
				outputName: "a",
				requiresBrowser: false,
				requiresLogin: false,
			},
			{
				command: "b/x",
				platform: "b",
				args: [],
				angle: "",
				outputName: "b",
				requiresBrowser: true,
				requiresLogin: false,
			},
			{
				command: "c/x",
				platform: "c",
				args: [],
				angle: "",
				outputName: "c",
				requiresBrowser: false,
				requiresLogin: false,
			},
			{
				command: "d/x",
				platform: "d",
				args: [],
				angle: "",
				outputName: "d",
				requiresBrowser: true,
				requiresLogin: false,
			},
		];
		const result = interleaveCalls(calls);
		expect(result.map((c) => c.platform)).toEqual(["a", "b", "c", "d"]);
	});

	it("keeps relative order within each group", () => {
		const calls = [
			{
				command: "a/1",
				platform: "a",
				args: [],
				angle: "",
				outputName: "a1",
				requiresBrowser: false,
				requiresLogin: false,
			},
			{
				command: "b/1",
				platform: "b",
				args: [],
				angle: "",
				outputName: "b1",
				requiresBrowser: true,
				requiresLogin: false,
			},
			{
				command: "a/2",
				platform: "a",
				args: [],
				angle: "",
				outputName: "a2",
				requiresBrowser: false,
				requiresLogin: false,
			},
			{
				command: "b/2",
				platform: "b",
				args: [],
				angle: "",
				outputName: "b2",
				requiresBrowser: true,
				requiresLogin: false,
			},
		];
		const result = interleaveCalls(calls);
		expect(result.map((c) => c.outputName)).toEqual(["a1", "b1", "a2", "b2"]);
	});

	it("handles all-browser input", () => {
		const calls = [
			{
				command: "a/x",
				platform: "a",
				args: [],
				angle: "",
				outputName: "a",
				requiresBrowser: true,
				requiresLogin: false,
			},
			{
				command: "b/x",
				platform: "b",
				args: [],
				angle: "",
				outputName: "b",
				requiresBrowser: true,
				requiresLogin: false,
			},
		];
		const result = interleaveCalls(calls);
		expect(result.map((c) => c.platform)).toEqual(["a", "b"]);
	});

	it("handles empty input", () => {
		expect(interleaveCalls([])).toEqual([]);
	});
});

describe("COLLECT_PLAN", () => {
	it("has calls for every entry", () => {
		expect(COLLECT_PLAN.length).toBeGreaterThan(0);
	});

	it("has unique output names", () => {
		const names = COLLECT_PLAN.map((c) => c.outputName);
		const uniqueNames = new Set(names);
		expect(uniqueNames.size).toBe(names.length);
	});

	it("derives platform from command", () => {
		for (const call of COLLECT_PLAN) {
			expect(call.platform).toBe(call.command.split("/")[0]);
		}
	});
});
