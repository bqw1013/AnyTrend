/**
 * Environment diagnostics ("anytrend doctor").
 *
 * Checks:
 * - Node.js version against package.json engines requirement
 * - websculpt CLI presence and version
 * - Required command coverage (COLLECT_PLAN vs websculpt command list)
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COLLECT_PLAN, type CollectCall } from "../config/collect-plan.js";
import type { Logger } from "./logger.js";
import { createLogger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DoctorCheckResult {
	label: string;
	passed: boolean;
	message: string;
}

export interface DoctorReport {
	allPassed: boolean;
	checks: DoctorCheckResult[];
}

function getPkg(): { version: string; engines: Record<string, string> } {
	return JSON.parse(readFileSync(path.join(__dirname, "..", "..", "package.json"), "utf-8")) as {
		version: string;
		engines: Record<string, string>;
	};
}

function parseNodeVersion(version: string): string {
	// Strip leading 'v' if present
	return version.replace(/^v/, "");
}

function satisfiesRange(version: string, range: string): boolean {
	// Handle simple ">=N" patterns. For complex semver, a library would be better,
	// but we keep dependencies minimal.
	const major = Number.parseInt(version.split(".")[0] ?? "0", 10);
	const match = /^>=(\d+)/.exec(range);
	if (match?.[1]) {
		const required = Number.parseInt(match[1] ?? "0", 10);
		return major >= required;
	}
	// Fallback: compare as strings (naive)
	return (
		version.localeCompare(range.replace(/^[>=<]+/, ""), undefined, {
			numeric: true,
		}) >= 0
	);
}

async function execCommand(
	command: string,
	args: string[],
	timeoutMs: number,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
	return new Promise((resolve) => {
		const proc = spawn(command, args, {
			stdio: ["ignore", "pipe", "pipe"],
			shell: process.platform === "win32",
		});

		let stdout = "";
		let stderr = "";

		proc.stdout.on("data", (chunk: Buffer) => {
			stdout += chunk.toString("utf-8");
		});

		proc.stderr.on("data", (chunk: Buffer) => {
			stderr += chunk.toString("utf-8");
		});

		const timeout = setTimeout(() => {
			proc.kill();
			resolve({ stdout, stderr, code: null });
		}, timeoutMs);

		proc.on("close", (code) => {
			clearTimeout(timeout);
			resolve({ stdout, stderr, code });
		});

		proc.on("error", () => {
			clearTimeout(timeout);
			resolve({ stdout, stderr, code: null });
		});
	});
}

/**
 * Check Node.js version against the engines requirement in package.json.
 */
async function checkNodeVersion(): Promise<DoctorCheckResult> {
	const pkg = getPkg();
	const required = pkg.engines?.node ?? ">=22";
	const current = parseNodeVersion(process.version);
	const passed = satisfiesRange(current, required);

	return {
		label: "Node.js",
		passed,
		message: passed
			? `v${current} (requires ${required})`
			: `v${current} is too old (requires ${required}) — please upgrade Node.js`,
	};
}

/**
 * Check that the websculpt CLI is installed and executable.
 */
async function checkWebsculptCli(): Promise<DoctorCheckResult> {
	const { stdout, code } = await execCommand("websculpt", ["--version"], 15_000);

	if (code === 0 && stdout.trim()) {
		return {
			label: "websculpt CLI",
			passed: true,
			message: stdout.trim(),
		};
	}

	return {
		label: "websculpt CLI",
		passed: false,
		message: "websculpt not found on PATH — install it: https://github.com/anthropics/websculpt",
	};
}

/**
 * Parse `websculpt command list` output to extract registered command names.
 * Expected format: each line starts with the command name (e.g. "baidu/get-hot").
 */
function parseCommandList(stdout: string): Set<string> {
	const commands = new Set<string>();
	for (const line of stdout.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		// Command names look like "platform/action"
		const match = /^([a-z][a-z0-9]*\/[a-z][a-z0-9-]*)/i.exec(trimmed);
		if (match?.[1]) {
			commands.add(match[1]);
		}
	}
	return commands;
}

/**
 * Check that every command in COLLECT_PLAN is registered in websculpt.
 */
async function checkRequiredCommands(): Promise<DoctorCheckResult> {
	const { stdout, code } = await execCommand("websculpt", ["command", "list"], 15_000);

	if (code !== 0 || !stdout.trim()) {
		return {
			label: "WebSculpt commands",
			passed: false,
			message: "Could not run 'websculpt command list' — is websculpt installed and configured?",
		};
	}

	const installed = parseCommandList(stdout);
	const required = new Set(COLLECT_PLAN.map((c: CollectCall) => c.command));
	const missing: string[] = [];

	for (const cmd of required) {
		if (!installed.has(cmd)) {
			missing.push(cmd);
		}
	}

	if (missing.length === 0) {
		return {
			label: "WebSculpt commands",
			passed: true,
			message: `All ${required.size} required commands installed`,
		};
	}

	const uniqueMissing = [...new Set(missing)].sort();
	return {
		label: "WebSculpt commands",
		passed: false,
		message: `Missing ${uniqueMissing.length} command(s): ${uniqueMissing.join(", ")}`,
	};
}

/**
 * Run all doctor checks and return a report.
 */
export async function runDoctor(logger?: Logger): Promise<DoctorReport> {
	const log = logger ?? createLogger({ quiet: false });

	log.info("Running environment diagnostics...\n");

	const checks: DoctorCheckResult[] = [];

	// 1. Node.js version
	const nodeCheck = await checkNodeVersion();
	checks.push(nodeCheck);

	// 2. websculpt CLI
	const wsCheck = await checkWebsculptCli();
	checks.push(wsCheck);

	// 3. Required commands (only if websculpt is present)
	if (wsCheck.passed) {
		const cmdCheck = await checkRequiredCommands();
		checks.push(cmdCheck);
	} else {
		checks.push({
			label: "WebSculpt commands",
			passed: false,
			message: "Skipped — websculpt CLI not available",
		});
	}

	const allPassed = checks.every((c) => c.passed);

	return { allPassed, checks };
}

/**
 * Format a DoctorReport for terminal output.
 * Uses ANSI color codes directly (compatible with picocolors override via NO_COLOR).
 */
export function formatDoctorReport(report: DoctorReport, useColor: boolean): string {
	const lines: string[] = [];
	const checkMark = useColor ? "\x1b[32m✓\x1b[0m" : "✓";
	const crossMark = useColor ? "\x1b[31m✗\x1b[0m" : "✗";

	for (const check of report.checks) {
		const icon = check.passed ? checkMark : crossMark;
		lines.push(`  ${icon} ${check.label}: ${check.message}`);
	}

	lines.push("");
	if (report.allPassed) {
		const okLine = "Environment is ready.";
		lines.push(useColor ? `\x1b[32m${okLine}\x1b[0m` : okLine);
	} else {
		const failLine = "Environment is NOT ready. Fix the issues above before running collections.";
		lines.push(useColor ? `\x1b[31m${failLine}\x1b[0m` : failLine);
	}

	return lines.join("\n");
}
