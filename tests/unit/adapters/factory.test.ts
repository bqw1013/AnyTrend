import { describe, expect, it } from "vitest";
import { defineAdapter } from "../../../src/adapters/factory.js";
import type { RawInput } from "../../../src/types/index.js";

// ---------------------------------------------------------------------------
// Basic structure
// ---------------------------------------------------------------------------

describe("defineAdapter", () => {
	it("returns an object conforming to AdapterModule", () => {
		const mod = defineAdapter({
			command: "test/get-stuff",
			platform: "test",
			language: "en",
			category: "en-general",
			board_type: "trending",
			mapItem: () => null,
		});

		expect(mod.PLATFORM).toBe("test");
		expect(mod.LANGUAGE).toBe("en");
		expect(mod.CATEGORY).toBe("en-general");
		expect(mod.BOARD_TYPE).toBe("trending");
		expect(typeof mod.normalize).toBe("function");
	});

	// -----------------------------------------------------------------------
	// Failure branch
	// -----------------------------------------------------------------------

	it("returns empty items when raw.success is false", () => {
		const mod = defineAdapter({
			command: "test/get-stuff",
			platform: "test",
			language: "en",
			category: "en-general",
			board_type: "trending",
			mapItem: () => ({
				id: "x",
				rank: null,
				title: "x",
				url: null,
				heat: null,
				heat_raw: null,
				summary: null,
				tags: [],
			}),
		});

		const raw: RawInput = { success: false, error: "something went wrong" };
		const output = mod.normalize(raw);

		expect(output.items).toEqual([]);
		expect(output.response_meta.success).toBe(false);
		expect(output.response_meta.error).toEqual({ code: "UNKNOWN_ERROR", message: "something went wrong" });
	});

	it("uses raw.command over config.command when available", () => {
		const mod = defineAdapter({
			command: "test/get-stuff",
			platform: "test",
			language: "en",
			category: "en-general",
			board_type: "trending",
			mapItem: () => null,
		});

		const output = mod.normalize({ success: true, command: "test/overridden", data: { items: [] } });
		expect(output.command).toBe("test/overridden");
	});

	// -----------------------------------------------------------------------
	// mapItem filtering
	// -----------------------------------------------------------------------

	it("filters out entries where mapItem returns null", () => {
		const mod = defineAdapter({
			command: "test/get-stuff",
			platform: "test",
			language: "en",
			category: "en-general",
			board_type: "trending",
			mapItem: (entry) => {
				if (!entry.keep) return null;
				return {
					id: `test:_:0:${entry.title}`,
					rank: null,
					title: entry.title as string,
					url: null,
					heat: null,
					heat_raw: null,
					summary: null,
					tags: [],
				};
			},
		});

		const raw: RawInput = {
			success: true,
			data: {
				items: [
					{ title: "keep me", keep: true },
					{ title: "drop me", keep: false },
					{ title: "keep too", keep: true },
				],
			},
		};

		const output = mod.normalize(raw);
		expect(output.items).toHaveLength(2);
		expect(output.items[0].title).toBe("keep me");
		expect(output.items[1].title).toBe("keep too");
	});

	// -----------------------------------------------------------------------
	// Default variant
	// -----------------------------------------------------------------------

	it("uses '_' as default variant", () => {
		const mod = defineAdapter({
			command: "test/get-stuff",
			platform: "test",
			language: "en",
			category: "en-general",
			board_type: "trending",
			mapItem: (_entry, ctx) => ({
				id: `x:${ctx.variant}:0:t`,
				rank: null,
				title: "t",
				url: null,
				heat: null,
				heat_raw: null,
				summary: null,
				tags: [],
			}),
		});

		const raw: RawInput = { success: true, data: { items: [{ title: "t" }] } };
		const output = mod.normalize(raw);
		expect(output.items[0].id).toContain(":_:");
	});

	// -----------------------------------------------------------------------
	// Custom variant
	// -----------------------------------------------------------------------

	it("uses custom variant function when provided", () => {
		const mod = defineAdapter({
			command: "test/get-stuff",
			platform: "test",
			language: "en",
			category: "en-general",
			board_type: "trending",
			variant: (_raw, data) => (typeof data.tab === "string" ? data.tab : "_"),
			mapItem: (_entry, ctx) => ({
				id: `x:${ctx.variant}:0:t`,
				rank: null,
				title: "t",
				url: null,
				heat: null,
				heat_raw: null,
				summary: null,
				tags: [],
			}),
		});

		const raw: RawInput = { success: true, data: { tab: "custom", items: [{ title: "t" }] } };
		const output = mod.normalize(raw);
		expect(output.items[0].id).toContain(":custom:");
	});

	// -----------------------------------------------------------------------
	// Custom items
	// -----------------------------------------------------------------------

	it("uses custom items function when provided", () => {
		const mod = defineAdapter({
			command: "test/get-stuff",
			platform: "test",
			language: "en",
			category: "en-general",
			board_type: "trending",
			items: (_raw, data) => (Array.isArray(data.articles) ? data.articles : []),
			mapItem: (entry, ctx) => ({
				id: `x:${ctx.variant}:${ctx.index}:${entry.title}`,
				rank: null,
				title: entry.title as string,
				url: null,
				heat: null,
				heat_raw: null,
				summary: null,
				tags: [],
			}),
		});

		const raw: RawInput = {
			success: true,
			data: { articles: [{ title: "a1" }, { title: "a2" }], items: [{ title: "ignored" }] },
		};
		const output = mod.normalize(raw);
		expect(output.items).toHaveLength(2);
		expect(output.items[0].title).toBe("a1");
	});

	// -----------------------------------------------------------------------
	// ItemContext.index
	// -----------------------------------------------------------------------

	it("provides correct index in context", () => {
		const indices: number[] = [];

		const mod = defineAdapter({
			command: "test/get-stuff",
			platform: "test",
			language: "en",
			category: "en-general",
			board_type: "trending",
			mapItem: (_entry, ctx) => {
				indices.push(ctx.index);
				return {
					id: `x:_:${ctx.index}:t`,
					rank: null,
					title: "t",
					url: null,
					heat: null,
					heat_raw: null,
					summary: null,
					tags: [],
				};
			},
		});

		const raw: RawInput = { success: true, data: { items: [{}, {}, {}] } };
		mod.normalize(raw);
		expect(indices).toEqual([0, 1, 2]);
	});
});
