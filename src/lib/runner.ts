/**
 * Collection runner utilities.
 *
 * Responsible for:
 * - Resolving dynamic placeholders (e.g. "{{yesterday_pt}}")
 * - Executing websculpt commands
 * - Enforcing concurrency limits and same-platform sequentiality
 */

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CollectCall } from "../config/collect-plan.js";

export interface CallResult {
	call: CollectCall;
	resolvedArgs: string[];
	status: "success" | "error";
	durationMs: number;
	outputPath: string;
	itemCount: number | null;
	error: string | null;
}

/**
 * Returns yesterday's date in Pacific Time (PT) as YYYY-MM-DD.
 * Product Hunt's daily cycle is anchored to PT.
 */
export function getYesterdayPt(): string {
	const now = new Date();
	const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: "America/Los_Angeles",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(yesterday);

	const year = parts.find((p) => p.type === "year")?.value;
	const month = parts.find((p) => p.type === "month")?.value;
	const day = parts.find((p) => p.type === "day")?.value;

	if (!year || !month || !day) {
		throw new Error("Failed to compute yesterday in PT");
	}

	return `${year}-${month}-${day}`;
}

/**
 * Resolves dynamic argument placeholders.
 */
export function resolveArgs(args: string[]): string[] {
	return args.map((arg) => {
		if (arg === "{{yesterday_pt}}") {
			return getYesterdayPt();
		}
		return arg;
	});
}

/**
 * Executes a single websculpt call and writes stdout to the raw output file.
 */
export async function runWebsculptCall(
	call: CollectCall,
	rawDir: string,
	index: number,
	total: number,
): Promise<CallResult> {
	mkdirSync(rawDir, { recursive: true });
	const outputPath = path.join(rawDir, `${call.outputName}.json`);
	const args = resolveArgs(call.args);
	const [platform, action] = call.command.split("/");

	if (!platform || !action) {
		throw new Error(`Invalid command: ${call.command}`);
	}

	const start = Date.now();
	const timeoutMs = 120_000;
	console.log(`[${index + 1}/${total}] ${call.command} ${args.join(" ")}`);

	return new Promise((resolve) => {
		const proc = spawn("websculpt", [platform, action, ...args], {
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";
		let settled = false;

		const timeout = setTimeout(() => {
			if (settled) return;
			settled = true;
			proc.kill();
			const durationMs = Date.now() - start;
			writeFileSync(outputPath, stdout, "utf-8");
			resolve({
				call,
				resolvedArgs: args,
				status: "error",
				durationMs,
				outputPath,
				itemCount: null,
				error: `Timed out after ${timeoutMs}ms`,
			});
		}, timeoutMs);

		function finish(error: string | null) {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			const durationMs = Date.now() - start;
			writeFileSync(outputPath, stdout, "utf-8");

			let itemCount: number | null = null;
			if (!error) {
				try {
					const parsed = JSON.parse(stdout) as {
						success?: boolean;
						data?: unknown[] | Record<string, unknown>;
						error?: { code?: string; message?: string };
					};
					if (parsed.success === false) {
						error = parsed.error?.message || "WebSculpt reported failure";
					} else if (Array.isArray(parsed.data)) {
						itemCount = parsed.data.length;
					} else if (parsed.data && typeof parsed.data === "object") {
						// Some commands wrap the list under a nested key.
						const firstArray = Object.values(parsed.data).find((v) => Array.isArray(v));
						itemCount = firstArray?.length ?? null;
					}
				} catch {
					// stdout may contain non-JSON trailing lines; treat as unknown count.
					itemCount = null;
				}
			}

			resolve({
				call,
				resolvedArgs: args,
				status: error ? "error" : "success",
				durationMs,
				outputPath,
				itemCount,
				error,
			});
		}

		proc.stdout.on("data", (chunk: Buffer) => {
			stdout += chunk.toString("utf-8");
		});

		proc.stderr.on("data", (chunk: Buffer) => {
			stderr += chunk.toString("utf-8");
		});

		proc.on("error", (err) => {
			finish(err.message);
		});

		proc.on("close", (code) => {
			const error = code !== 0 ? stderr || `Process exited with code ${code}` : null;
			finish(error);
		});
	});
}

/**
 * Simple async semaphore for limiting concurrent work.
 */
class Semaphore {
	private permits: number;
	private waiters: Array<(release: () => void) => void> = [];

	constructor(permits: number) {
		this.permits = permits;
	}

	acquire(): Promise<() => void> {
		if (this.permits > 0) {
			this.permits--;
			return Promise.resolve(() => this.release());
		}
		return new Promise((resolve) => {
			this.waiters.push(resolve);
		});
	}

	private release() {
		if (this.waiters.length > 0) {
			const next = this.waiters.shift();
			if (next) next(() => this.release());
		} else {
			this.permits++;
		}
	}
}

/**
 * Runs all collection calls with two constraints:
 * 1. At most `maxConcurrency` calls run at the same time.
 * 2. Calls targeting the same platform never run concurrently.
 *
 * The pending queue is interleaved so that browser and non-browser calls
 * are mixed in the active set instead of running all fast calls first.
 */
export async function runAllCalls(
	calls: CollectCall[],
	rawDir: string,
	maxConcurrency: number,
	interCallDelayMs: number,
): Promise<CallResult[]> {
	const results: CallResult[] = [];
	const pending = [...calls];
	const platformLocks = new Set<string>();
	const running = new Set<Promise<void>>();
	const semaphore = new Semaphore(maxConcurrency);

	async function runOne(call: CollectCall, index: number, total: number): Promise<void> {
		const release = await semaphore.acquire();
		try {
			const result = await runWebsculptCall(call, rawDir, index, total);
			results.push(result);
			if (interCallDelayMs > 0) {
				await new Promise((resolve) => setTimeout(resolve, interCallDelayMs));
			}
		} finally {
			release();
		}
	}

	async function dispatchLoop(): Promise<void> {
		while (pending.length > 0) {
			// Wait for a free concurrency slot.
			while (running.size >= maxConcurrency) {
				await Promise.race(running);
			}

			const idx = pending.findIndex((c) => !platformLocks.has(c.platform));
			if (idx === -1) {
				// No call is ready because every remaining platform is in-flight.
				if (running.size > 0) {
					await Promise.race(running);
					continue;
				}
				break;
			}

			const call = pending.splice(idx, 1)[0];
			if (!call) {
				continue;
			}
			platformLocks.add(call.platform);

			const task = runOne(call, calls.length - pending.length - 1, calls.length).finally(() => {
				platformLocks.delete(call.platform);
				running.delete(task);
			});
			running.add(task);
		}

		await Promise.all(running);
	}

	await dispatchLoop();
	return results;
}
