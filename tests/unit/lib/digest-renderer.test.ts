import { describe, expect, it } from "vitest";
import { renderDigest } from "../../../src/lib/digest-renderer.js";
import type { NormalizedItem, NormalizedOutput } from "../../../src/types/index.js";

function makeOutput(items: NormalizedItem[]): NormalizedOutput {
	return {
		version: "1.0",
		generated_at: "2026-06-17T10:00:00.000Z",
		command: "baidu/get-hot",
		platform: "baidu",
		language: "zh",
		category: "zh-general",
		board_type: "hot-search",
		response_meta: {
			success: true,
			duration: 123,
			raw_total: 50,
			error: null,
		},
		items,
	};
}

describe("renderDigest", () => {
	it("renders a fully populated normalized output", () => {
		const output = makeOutput([
			{
				id: "1",
				rank: 1,
				title: "First title",
				url: "https://example.com/1",
				heat: "1.2M",
				heat_raw: 1_200_000,
				summary: "First summary",
				tags: ["tag-a", "tag-b"],
			},
		]);

		const result = renderDigest(output, "百度实时热搜");

		expect(result).toContain("# baidu/get-hot");
		expect(result).toContain("- 视角: 百度实时热搜");
		expect(result).toContain("- 平台: baidu");
		expect(result).toContain("- 语言: zh");
		expect(result).toContain("- 分类: zh-general");
		expect(result).toContain("- 榜单类型: hot-search");
		expect(result).toContain("- 条目数: 1");
		expect(result).toContain("1. **First title**");
		expect(result).toContain("- 排名: 1");
		expect(result).toContain("- 热度: 1.2M");
		expect(result).toContain("- 标签: tag-a, tag-b");
		expect(result).toContain("- 摘要: First summary");
		expect(result).toContain("- 链接: https://example.com/1");
	});

	it("omits rank and keeps sequential numbering when rank is null", () => {
		const output = makeOutput([
			{ id: "a", rank: null, title: "A", url: null, heat: null, heat_raw: null, summary: null, tags: [] },
			{ id: "b", rank: null, title: "B", url: null, heat: null, heat_raw: null, summary: null, tags: [] },
		]);

		const result = renderDigest(output, "feed");

		expect(result).not.toContain("排名:");
		expect(result).toContain("1. **A**");
		expect(result).toContain("2. **B**");
	});

	it("shows 无 when tags are empty", () => {
		const output = makeOutput([
			{ id: "1", rank: 1, title: "Title", url: null, heat: null, heat_raw: null, summary: null, tags: [] },
		]);

		const result = renderDigest(output, "angle");

		expect(result).toContain("- 标签: 无");
	});

	it("renders multiple tags as comma-separated values", () => {
		const output = makeOutput([
			{
				id: "1",
				rank: 1,
				title: "Title",
				url: null,
				heat: null,
				heat_raw: null,
				summary: null,
				tags: ["a", "b", "c"],
			},
		]);

		const result = renderDigest(output, "angle");

		expect(result).toContain("- 标签: a, b, c");
	});

	it("omits heat, summary, and url when null", () => {
		const output = makeOutput([
			{ id: "1", rank: 1, title: "Title", url: null, heat: null, heat_raw: null, summary: null, tags: [] },
		]);

		const result = renderDigest(output, "angle");

		expect(result).not.toContain("热度:");
		expect(result).not.toContain("摘要:");
		expect(result).not.toContain("链接:");
	});

	it("omits summary when empty string", () => {
		const output = makeOutput([
			{
				id: "1",
				rank: 1,
				title: "Title",
				url: null,
				heat: null,
				heat_raw: null,
				summary: "",
				tags: [],
			},
		]);

		const result = renderDigest(output, "angle");

		expect(result).not.toContain("摘要:");
	});

	it("renders empty items message when no items", () => {
		const output = makeOutput([]);

		const result = renderDigest(output, "angle");

		expect(result).toContain("- 条目数: 0");
		expect(result).toContain("暂无条目。");
	});
});
