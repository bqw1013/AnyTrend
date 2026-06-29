/**
 * Setup helper for importing bundled WebSculpt commands.
 *
 * Used by the CLI `anytrend setup` command. Not a standalone script.
 */

import type { ChildProcess, SpawnOptions } from "node:child_process";
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Logger } from "./logger.js";
import { defaultLogger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RunSetupOptions {
	/** When true, print the import command instead of executing it. */
	dryRun?: boolean;
	/** When true, overwrite existing config files. */
	force?: boolean;
	/** Optional logger; defaults to console output. */
	logger?: Logger;
}

export interface RunSetupDependencies {
	/** Spawn implementation used to run websculpt commands. */
	spawn: (command: string, args: string[], options: SpawnOptions) => ChildProcess;
	/** Filesystem check used to locate the bundled assets directory. */
	existsSync: (path: string) => boolean;
}

export interface RunSetupResult {
	/** Whether the setup completed successfully. */
	success: boolean;
	/** Absolute path to the bundled WebSculpt commands directory. */
	assetsDir: string;
	/** Human-readable error message when success is false. */
	error?: string;
}

const defaultDeps: RunSetupDependencies = {
	spawn,
	existsSync,
};

/**
 * Returns the absolute path to the bundled WebSculpt commands directory.
 */
export function getBundledAssetsDir(): string {
	return path.join(__dirname, "..", "..", "assets", "websculpt-commands");
}

/**
 * Returns the absolute path to the bundled site.yaml config file.
 */
export function getBundledSiteConfigPath(): string {
	return path.join(__dirname, "..", "..", "config", "site.yaml");
}

/**
 * Copies the bundled site.yaml to the user's project root (CWD `config/site.yaml`).
 * Skips if the target already exists, unless `force` is true.
 *
 * Returns the target path on success, or null if the bundled source is missing.
 */
function copySiteConfig(logger: Logger, force: boolean): string | null {
	const source = getBundledSiteConfigPath();
	const target = path.resolve("config", "site.yaml");

	if (!existsSync(source)) {
		logger.warn(`Bundled site.yaml not found at ${source}, skipping config copy.`);
		return null;
	}

	if (existsSync(target) && !force) {
		logger.log(`Config already exists at ${target}, skipping. Use --force to overwrite.`);
		return target;
	}

	mkdirSync(path.dirname(target), { recursive: true });
	copyFileSync(source, target);
	logger.log(`Config copied to ${target}`);
	return target;
}

function checkWebsculpt(deps: RunSetupDependencies): Promise<{ ok: boolean; error: string | null }> {
	return new Promise((resolve) => {
		const proc = deps.spawn("websculpt", ["--version"], {
			stdio: ["ignore", "pipe", "pipe"],
			shell: process.platform === "win32",
		});

		let stderr = "";
		proc.stderr?.on("data", (chunk: Buffer) => {
			stderr += chunk.toString("utf-8");
		});
		proc.on("error", (err: Error) => {
			resolve({ ok: false, error: err.message });
		});
		proc.on("close", (code: number | null) => {
			resolve({ ok: code === 0, error: stderr || null });
		});
	});
}

function runImport(deps: RunSetupDependencies, args: string[]): Promise<number | null> {
	return new Promise((resolve, reject) => {
		const proc = deps.spawn("websculpt", args, {
			stdio: "inherit",
			shell: process.platform === "win32",
		});
		proc.on("error", (err: Error) => {
			reject(err);
		});
		proc.on("close", (code: number | null) => {
			resolve(code);
		});
	});
}

/**
 * Imports bundled WebSculpt commands into the local command library.
 *
 * @param options - Setup options.
 * @param deps - Injectable dependencies for testing.
 * @returns Result indicating success or failure.
 */
export async function runSetup(
	options: RunSetupOptions = {},
	deps: RunSetupDependencies = defaultDeps,
): Promise<RunSetupResult> {
	const logger = options.logger ?? defaultLogger;
	const assetsDir = getBundledAssetsDir();

	if (!deps.existsSync(assetsDir)) {
		const error = `Bundled WebSculpt commands not found at ${assetsDir}`;
		logger.error(error);
		return { success: false, assetsDir, error };
	}

	const versionCheck = await checkWebsculpt(deps);
	if (!versionCheck.ok) {
		logger.error("websculpt CLI is not available. Install it first:");
		logger.error("  npm install -g @playwright/cli@0.1.13 websculpt");
		logger.error("  websculpt skill install --lang zh");
		if (versionCheck.error) {
			logger.error(`Error: ${versionCheck.error}`);
		}
		return { success: false, assetsDir, error: versionCheck.error ?? "websculpt not found" };
	}

	const args = ["command", "import", "--from", assetsDir];
	logger.log(`Running: websculpt ${args.join(" ")}`);

	if (options.dryRun) {
		logger.log("Dry run: command not executed.");
		return { success: true, assetsDir };
	}

	try {
		const code = await runImport(deps, args);
		if (code !== 0) {
			const error = `websculpt command import exited with code ${code ?? "unknown"}`;
			logger.error(error);
			return { success: false, assetsDir, error };
		}

		// Copy default site.yaml to user's project root
		copySiteConfig(logger, options.force ?? false);

		return { success: true, assetsDir };
	} catch (err) {
		const error = err instanceof Error ? err.message : String(err);
		logger.error(error);
		return { success: false, assetsDir, error };
	}
}
