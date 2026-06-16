import { describe, expect, it } from "vitest";
import {
	cleanText,
	extractTotal,
	formatCount,
	generateId,
	getDataArray,
	getDataObject,
	isRecord,
	parseHeat,
	parseNumber,
	parseTime,
	toArray,
} from "../../src/adapters/utils.js";
import type { RawInput } from "../../src/types/index.js";

// ---------------------------------------------------------------------------
// isRecord
// ---------------------------------------------------------------------------

describe("isRecord", () => {
	it("returns true for plain objects", () => {
		expect(isRecord({})).toBe(true);
		expect(isRecord({ a: 1 })).toBe(true);
	});

	it("returns false for null", () => {
		expect(isRecord(null)).toBe(false);
	});

	it("returns false for arrays", () => {
		expect(isRecord([])).toBe(false);
		expect(isRecord([1, 2, 3])).toBe(false);
	});

	it("returns false for primitives", () => {
		expect(isRecord("string")).toBe(false);
		expect(isRecord(123)).toBe(false);
		expect(isRecord(true)).toBe(false);
		expect(isRecord(undefined)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getDataObject
// ---------------------------------------------------------------------------

describe("getDataObject", () => {
	it("returns data when it is a plain object", () => {
		const raw: RawInput = { data: { items: [] } };
		expect(getDataObject(raw)).toEqual({ items: [] });
	});

	it("returns empty object when data is an array", () => {
		const raw: RawInput = { data: [1, 2, 3] };
		expect(getDataObject(raw)).toEqual({});
	});

	it("returns empty object when data is null", () => {
		const raw: RawInput = { data: null as unknown as undefined };
		expect(getDataObject(raw)).toEqual({});
	});

	it("returns empty object when data is missing", () => {
		const raw: RawInput = {};
		expect(getDataObject(raw)).toEqual({});
	});
});

// ---------------------------------------------------------------------------
// getDataArray
// ---------------------------------------------------------------------------

describe("getDataArray", () => {
	it("returns data when it is an array", () => {
		const raw: RawInput = { data: [1, 2, 3] };
		expect(getDataArray(raw)).toEqual([1, 2, 3]);
	});

	it("returns empty array when data is an object", () => {
		const raw: RawInput = { data: { items: [] } };
		expect(getDataArray(raw)).toEqual([]);
	});

	it("returns empty array when data is null", () => {
		const raw: RawInput = { data: null as unknown as undefined };
		expect(getDataArray(raw)).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// cleanText
// ---------------------------------------------------------------------------

describe("cleanText", () => {
	it("returns null for null / undefined", () => {
		expect(cleanText(null)).toBeNull();
		expect(cleanText(undefined)).toBeNull();
	});

	it("returns null for empty or whitespace-only strings", () => {
		expect(cleanText("")).toBeNull();
		expect(cleanText("   ")).toBeNull();
		expect(cleanText("\t\n")).toBeNull();
	});

	it("trims and decodes HTML entities", () => {
		expect(cleanText("  hello  ")).toBe("hello");
		expect(cleanText("&amp;")).toBe("&");
		expect(cleanText("&lt;div&gt;")).toBe("<div>");
	});

	it("handles numbers by converting to string", () => {
		expect(cleanText(123)).toBe("123");
	});
});

// ---------------------------------------------------------------------------
// toArray
// ---------------------------------------------------------------------------

describe("toArray", () => {
	it("returns empty array for null / undefined", () => {
		expect(toArray(null)).toEqual([]);
		expect(toArray(undefined)).toEqual([]);
	});

	it("returns empty array for empty string", () => {
		expect(toArray("")).toEqual([]);
		expect(toArray("   ")).toEqual([]);
	});

	it("wraps a single string in an array", () => {
		expect(toArray("hello")).toEqual(["hello"]);
	});

	it("cleans each element of an existing array", () => {
		expect(toArray(["hello", "  world  ", "", null])).toEqual(["hello", "world"]);
	});

	it("returns empty array when all elements are empty", () => {
		expect(toArray(["", "   ", null])).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// parseNumber
// ---------------------------------------------------------------------------

describe("parseNumber", () => {
	it("returns null for null / undefined / boolean", () => {
		expect(parseNumber(null)).toBeNull();
		expect(parseNumber(undefined)).toBeNull();
		expect(parseNumber(true)).toBeNull();
	});

	it("returns truncated integer for numeric values", () => {
		expect(parseNumber(42)).toBe(42);
		expect(parseNumber(3.14)).toBe(3);
	});

	it("parses Chinese units", () => {
		expect(parseNumber("780 万")).toBe(7_800_000);
		expect(parseNumber("1.4 万")).toBe(14_000);
		expect(parseNumber("1 亿")).toBe(100_000_000);
	});

	it("parses SI suffixes", () => {
		expect(parseNumber("6.9M")).toBe(6_900_000);
		expect(parseNumber("3.8K")).toBe(3_800);
	});

	it("falls back to extracting digits", () => {
		expect(parseNumber("5468 views")).toBe(5_468);
	});

	it("returns null for non-numeric strings", () => {
		expect(parseNumber("hello")).toBeNull();
		expect(parseNumber("")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// formatCount
// ---------------------------------------------------------------------------

describe("formatCount", () => {
	it("formats yi (100 million+)", () => {
		expect(formatCount(100_000_000)).toBe("1亿");
		expect(formatCount(150_000_000)).toBe("1.5亿");
	});

	it("formats wan (10k+)", () => {
		expect(formatCount(10_000)).toBe("1万");
		expect(formatCount(14_000)).toBe("1.4万");
		expect(formatCount(7_800_000)).toBe("780万");
	});

	it("returns plain number for smaller values", () => {
		expect(formatCount(5_468)).toBe("5468");
		expect(formatCount(0)).toBe("0");
	});
});

// ---------------------------------------------------------------------------
// parseHeat
// ---------------------------------------------------------------------------

describe("parseHeat", () => {
	it("returns [null, null] for null / undefined / NaN", () => {
		expect(parseHeat(null)).toEqual([null, null]);
		expect(parseHeat(undefined)).toEqual([null, null]);
	});

	it("handles plain numbers", () => {
		expect(parseHeat(12345)).toEqual(["1.2万", 12_345]);
	});

	it("handles pure numeric strings", () => {
		expect(parseHeat("7808179")).toEqual(["780.8万", 7_808_179]);
	});

	it("handles strings with units", () => {
		const [heatText, heatRaw] = parseHeat("1073 万热度");
		expect(heatText).toBe("1073 万热度");
		expect(heatRaw).toBe(10_730_000);
	});

	it("handles empty string", () => {
		expect(parseHeat("")).toEqual([null, null]);
	});
});

// ---------------------------------------------------------------------------
// parseTime
// ---------------------------------------------------------------------------

describe("parseTime", () => {
	it("returns null for null / undefined / empty", () => {
		expect(parseTime(null)).toBeNull();
		expect(parseTime(undefined)).toBeNull();
		expect(parseTime("")).toBeNull();
	});

	it("returns ISO strings unchanged", () => {
		const iso = "2026-06-15T12:00:00.000Z";
		expect(parseTime(iso)).toBe(iso);
	});

	it("converts slash format (yyyy/MM/dd HH:mm)", () => {
		const result = parseTime("2026/06/15 15:15");
		expect(result).toBe("2026-06-15T15:15:00+08:00");
	});

	it("converts dash format (yyyy-MM-dd HH:mm:ss)", () => {
		const result = parseTime("2026-06-15 15:15:30");
		expect(result).toBe("2026-06-15T15:15:30+08:00");
	});

	it("returns the original text if format is unrecognized", () => {
		expect(parseTime("3 hours ago")).toBe("3 hours ago");
	});
});

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------

describe("generateId", () => {
	it("joins parts with colon", () => {
		expect(generateId("baidu", "realtime", 1, "title")).toBe("baidu:realtime:1:title");
	});

	it("replaces colons and newlines in parts", () => {
		expect(generateId("github", "variant", 1, "a:b\nc")).toBe("github:variant:1:a_b c");
	});

	it("replaces null / undefined with '_'", () => {
		expect(generateId("baidu", "_", null, "title")).toBe("baidu:_:_:title");
	});

	it("handles empty string parts", () => {
		expect(generateId("baidu", "_", 1, "")).toBe("baidu:_:1:_");
	});
});

// ---------------------------------------------------------------------------
// extractTotal
// ---------------------------------------------------------------------------

describe("extractTotal", () => {
	it("extracts from total", () => {
		const raw: RawInput = { data: { total: 50 } };
		expect(extractTotal(raw)).toBe(50);
	});

	it("extracts from total_count", () => {
		const raw: RawInput = { data: { total_count: 30 } };
		expect(extractTotal(raw)).toBe(30);
	});

	it("extracts from totalCount", () => {
		const raw: RawInput = { data: { totalCount: 25 } };
		expect(extractTotal(raw)).toBe(25);
	});

	it("extracts from count", () => {
		const raw: RawInput = { data: { count: 10 } };
		expect(extractTotal(raw)).toBe(10);
	});

	it("returns array length when data is an array", () => {
		const raw: RawInput = { data: [1, 2, 3, 4, 5] };
		expect(extractTotal(raw)).toBe(5);
	});

	it("returns null when no total can be found", () => {
		const raw: RawInput = { data: {} };
		expect(extractTotal(raw)).toBeNull();
	});
});
