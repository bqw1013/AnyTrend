/**
 * Collection plan listing ("anytrend sources list").
 *
 * Formats the COLLECT_PLAN as a human-readable text table.
 */

import { COLLECT_PLAN, type CollectCall } from "../config/collect-plan.js";

export interface SourcesTableOptions {
	useColor: boolean;
}

function pad(str: string, width: number): string {
	return str.padEnd(width, " ");
}

/**
 * Render COLLECT_PLAN as a formatted table string.
 */
export function formatSourcesTable(options: SourcesTableOptions = { useColor: true }): string {
	const { useColor } = options;

	const rows: string[][] = [];
	const headers = ["Command", "Angle", "Browser", "Login"];

	for (const call of COLLECT_PLAN) {
		rows.push([call.command, call.angle, call.requiresBrowser ? "yes" : "no", call.requiresLogin ? "yes" : "no"]);
	}

	// Calculate column widths
	const colWidths = headers.map((h, i) => {
		const maxData = rows.reduce((max, row) => Math.max(max, (row[i] ?? "").length), 0);
		return Math.max(h.length, maxData) + 2;
	});

	// Build table
	const lines: string[] = [];

	// Header
	const headerLine = headers.map((h, i) => pad(h, colWidths[i] ?? 10)).join("");
	lines.push(useColor ? `\x1b[1m${headerLine}\x1b[0m` : headerLine);

	// Separator
	const sep = colWidths.map((w) => "-".repeat(w)).join("");
	lines.push(sep);

	// Rows
	for (const row of rows) {
		const line = row.map((cell, i) => pad(cell, colWidths[i] ?? 10)).join("");
		lines.push(line);
	}

	lines.push("");
	lines.push(`Total: ${COLLECT_PLAN.length} sources`);
	lines.push(`Browser required: ${COLLECT_PLAN.filter((c: CollectCall) => c.requiresBrowser).length}`);
	lines.push(`Login required: ${COLLECT_PLAN.filter((c: CollectCall) => c.requiresLogin).length}`);

	return lines.join("\n");
}
