/**
 * Adapter discovery and dispatch module for AnyTrend.
 *
 * Command-to-file mapping (kebab-case filenames):
 *   baidu/get-hot          -> src/adapters/baidu-get-hot.ts
 *   hackernews/get-top     -> src/adapters/hackernews-get-top.ts
 *   huggingface/get-papers -> src/adapters/huggingface-get-papers.ts
 *
 * The platform is the first segment; the remaining segments form the action.
 */

import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { AdapterModule } from "../types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Converts a WebSculpt-style command name to the corresponding adapter module name.
 * Example: `baidu/get-hot` -> `baidu-get-hot`.
 */
export function commandToModule(command: string): string {
	return command.replaceAll("/", "-");
}

/**
 * Converts an adapter module name back to a WebSculpt-style command name.
 * Example: `baidu-get-hot` -> `baidu/get-hot`.
 */
export function moduleToCommand(moduleName: string): string {
	const firstSeparator = moduleName.indexOf("-");
	if (firstSeparator === -1) {
		return moduleName;
	}
	const platform = moduleName.slice(0, firstSeparator);
	const action = moduleName.slice(firstSeparator + 1);
	return `${platform}/${action}`;
}

/**
 * Loads the adapter module responsible for the given command.
 */
export async function getAdapter(command: string): Promise<AdapterModule> {
	const moduleName = commandToModule(command);
	const modulePath = path.join(__dirname, `${moduleName}.ts`);
	const moduleUrl = pathToFileURL(modulePath).href;

	try {
		const mod = (await import(moduleUrl)) as Partial<AdapterModule & { default?: AdapterModule }>;
		const adapter = mod.normalize ? mod : mod.default;
		if (!adapter || typeof adapter.normalize !== "function") {
			throw new Error(`Adapter for ${command} (${moduleName}.ts) does not export a normalize() function`);
		}
		return adapter as AdapterModule;
	} catch (error) {
		if (
			error instanceof Error &&
			"code" in error &&
			(error.code === "ERR_MODULE_NOT_FOUND" || error.code === "ERR_UNSUPPORTED_ESM_URL_SCHEME")
		) {
			throw new Error(`No adapter found for command: ${command}`);
		}
		throw error;
	}
}

/**
 * Lists all available adapter command names (useful for debugging and discovery).
 */
export function listAvailableAdapters(): string[] {
	const files = readdirSync(__dirname);
	return files
		.filter((f) => f.endsWith(".ts") && f !== "index.ts" && f !== "utils.ts" && !f.startsWith("_"))
		.map((f) => moduleToCommand(f.replace(/\.ts$/, "")))
		.sort();
}
