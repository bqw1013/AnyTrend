import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface RunNormalizeOptions {
	input: string;
	output: string;
}

const DEFAULT_NORMALIZE_TIMEOUT_MS = 30_000;

/**
 * Runs the single-file normalize script against the given input/output paths.
 */
export async function runNormalize(options: RunNormalizeOptions): Promise<void> {
	const { input, output } = options;
	await execFilePromise(
		"npx",
		["tsx", "src/scripts/normalize.ts", "--input", input, "--output", output],
		DEFAULT_NORMALIZE_TIMEOUT_MS,
	);
}

export interface RunNormalizeBatchOptions {
	rawDir: string;
	outDir: string;
}

const DEFAULT_NORMALIZE_BATCH_TIMEOUT_MS = 60_000;

/**
 * Runs the batch normalize script against the given raw and output directories.
 */
export async function runNormalizeBatch(options: RunNormalizeBatchOptions): Promise<void> {
	const { rawDir, outDir } = options;
	await execFilePromise(
		"npx",
		["tsx", "src/scripts/normalize-batch.ts", "--raw-dir", rawDir, "--out-dir", outDir],
		DEFAULT_NORMALIZE_BATCH_TIMEOUT_MS,
	);
}

export interface WebsculptResult {
	raw: unknown;
	stdout: string;
	stderr: string;
}

const DEFAULT_WEBSCULPT_TIMEOUT_MS = 60_000;

/**
 * Runs a WebSculpt command and returns the parsed JSON output along with raw streams.
 */
export interface RunWebsculptOptions {
	timeoutMs?: number;
	args?: string[];
}

export async function runWebsculpt(command: string, options: RunWebsculptOptions = {}): Promise<WebsculptResult> {
	const { timeoutMs = DEFAULT_WEBSCULPT_TIMEOUT_MS, args = [] } = options;
	const [platform, action] = command.split("/");
	if (!platform || !action) {
		throw new Error(`Invalid WebSculpt command: ${command}; expected format: platform/action`);
	}

	const { stdout, stderr } = await execFilePromise("websculpt", [platform, action, ...args], timeoutMs);
	let raw: unknown;
	try {
		raw = JSON.parse(stdout);
	} catch (err) {
		throw new Error(
			`Failed to parse WebSculpt stdout as JSON for ${command}: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
	return { raw, stdout, stderr };
}

/**
 * Converts a command identifier like `baidu/get-hot` to a filename like `baidu-get-hot.json`.
 */
export function commandToFilename(command: string): string {
	return `${command.replace(/\//g, "-")}.json`;
}

/**
 * Creates a temporary directory with the given prefix.
 */
export function createTempDir(prefix: string): string {
	return mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Removes a temporary directory recursively, ignoring errors if it does not exist.
 */
export function cleanupTempDir(dir: string): void {
	rmSync(dir, { recursive: true, force: true });
}

/**
 * Reads the version field from the project's package.json.
 */
export function getProjectVersion(): string {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const pkg = JSON.parse(readFileSync(path.join(__dirname, "..", "..", "package.json"), "utf-8")) as {
		version: string;
	};
	return pkg.version;
}

/**
 * Runs the given async function over `items` with at most `limit` concurrent executions.
 */
export async function runWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
	if (limit <= 0) {
		throw new Error("concurrency limit must be greater than 0");
	}
	let index = 0;
	const workerCount = Math.min(limit, items.length);
	const workers = Array.from({ length: workerCount }, async () => {
		while (index < items.length) {
			const currentIndex = index++;
			await fn(items[currentIndex]);
		}
	});
	await Promise.all(workers);
}

interface ExecResult {
	stdout: string;
	stderr: string;
}

function execFilePromise(command: string, args: string[], timeoutMs: number): Promise<ExecResult> {
	return new Promise((resolve, reject) => {
		// `shell: true` is required so that shell scripts such as `npx.cmd` on Windows are resolved.
		const child = execFile(command, args, { timeout: timeoutMs, shell: true }, (err, stdout, stderr) => {
			if (err) {
				reject(new Error(`Command failed: ${command} ${args.join(" ")}\n${err.message}\n${stderr}`));
				return;
			}
			resolve({ stdout, stderr });
		});

		child.on("error", (err) => {
			reject(new Error(`Failed to start command: ${command} ${args.join(" ")}\n${err.message}`));
		});
	});
}
