import { describe, expect, it } from "vitest";
import type { DoctorReport } from "../../src/lib/doctor.js";
import { formatDoctorReport } from "../../src/lib/doctor.js";

describe("formatDoctorReport", () => {
	const allPassedReport: DoctorReport = {
		allPassed: true,
		checks: [
			{ label: "Node.js", passed: true, message: "v22.11.0 (requires >=22)" },
			{ label: "websculpt CLI", passed: true, message: "1.2.3" },
			{ label: "WebSculpt commands", passed: true, message: "All 27 required commands installed" },
		],
	};

	const failedReport: DoctorReport = {
		allPassed: false,
		checks: [
			{ label: "Node.js", passed: true, message: "v22.11.0 (requires >=22)" },
			{ label: "websculpt CLI", passed: false, message: "websculpt not found on PATH" },
			{ label: "WebSculpt commands", passed: false, message: "Skipped — websculpt CLI not available" },
		],
	};

	it("returns a non-empty string", () => {
		const output = formatDoctorReport(allPassedReport, false);
		expect(output).toBeTruthy();
		expect(typeof output).toBe("string");
	});

	it("shows check marks for passed checks", () => {
		const output = formatDoctorReport(allPassedReport, false);
		expect(output).toContain("✓");
	});

	it("shows cross marks for failed checks", () => {
		const output = formatDoctorReport(failedReport, false);
		expect(output).toContain("✗");
	});

	it("shows 'Environment is ready' when all pass", () => {
		const output = formatDoctorReport(allPassedReport, false);
		expect(output).toContain("Environment is ready");
	});

	it("shows 'NOT ready' when any check fails", () => {
		const output = formatDoctorReport(failedReport, false);
		expect(output).toContain("NOT ready");
	});

	it("includes check labels in output", () => {
		const output = formatDoctorReport(allPassedReport, false);
		for (const check of allPassedReport.checks) {
			expect(output).toContain(check.label);
		}
	});

	it("includes check messages in output", () => {
		const output = formatDoctorReport(allPassedReport, false);
		for (const check of allPassedReport.checks) {
			expect(output).toContain(check.message);
		}
	});

	it("with useColor=true includes ANSI codes", () => {
		const output = formatDoctorReport(allPassedReport, true);
		expect(output).toContain("\x1b[32m");
	});

	it("with useColor=false has no ANSI codes", () => {
		const output = formatDoctorReport(allPassedReport, false);
		expect(output).not.toContain("\x1b[");
	});

	it("handles empty checks list", () => {
		const emptyReport: DoctorReport = { allPassed: true, checks: [] };
		const output = formatDoctorReport(emptyReport, false);
		expect(output).toContain("Environment is ready");
	});
});
