/**
 * Render a normalized output into a compact Markdown digest for Agent consumption.
 */

import type { NormalizedItem, NormalizedOutput } from "../types/index.js";

/**
 * Render a normalized output as a Markdown digest.
 *
 * @param output - The normalized output to render.
 * @param angle - Human-readable angle name for the source.
 * @returns A Markdown string containing source metadata and a numbered item list.
 */
export function renderDigest(output: NormalizedOutput, angle: string): string {
	const lines: string[] = [];

	lines.push(`# ${output.command}`);
	lines.push("");
	lines.push(`- 视角: ${angle}`);
	lines.push(`- 平台: ${output.platform}`);
	lines.push(`- 语言: ${output.language}`);
	lines.push(`- 分类: ${output.category}`);
	lines.push(`- 榜单类型: ${output.board_type}`);
	lines.push(`- 条目数: ${output.items.length}`);
	lines.push("");

	if (output.items.length === 0) {
		lines.push("暂无条目。");
		lines.push("");
		return lines.join("\n");
	}

	let index = 1;
	for (const item of output.items) {
		lines.push(renderItem(index, item));
		index++;
	}

	return lines.join("\n");
}

function renderItem(index: number, item: NormalizedItem): string {
	const lines: string[] = [];

	lines.push(`${index}. **${item.title}**`);

	if (item.rank !== null) {
		lines.push(`   - 排名: ${item.rank}`);
	}

	if (item.heat !== null) {
		lines.push(`   - 热度: ${item.heat}`);
	}

	const tags = item.tags.length > 0 ? item.tags.join(", ") : "无";
	lines.push(`   - 标签: ${tags}`);

	if (item.summary !== null && item.summary.length > 0) {
		lines.push(`   - 摘要: ${item.summary}`);
	}

	if (item.url !== null) {
		lines.push(`   - 链接: ${item.url}`);
	}

	return lines.join("\n");
}
