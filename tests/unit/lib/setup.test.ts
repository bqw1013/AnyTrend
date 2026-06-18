import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { createLogger } from "../../../src/lib/logger.js";
import { getBundledAssetsDir, type RunSetupDependencies, runSetup } from "../../../src/lib/setup.js";

function createMockDeps(
	overrides: {
		existsSync?: boolean;
		versionCode?: number | null;
		versionError?: Error;
		importCode?: number | null;
		importError?: Error;
	} = {},
): RunSetupDependencies {
	const emitter = new EventEmitter();
	return {
		existsSync: () => overrides.existsSync ?? true,
		spawn: vi.fn((_command: string, args: string[]) => {
			const isVersion = args[0] === "--version";
			const code = isVersion ? overrides.versionCode : overrides.importCode;
			const error = isVersion ? overrides.versionError : overrides.importError;

			process.nextTick(() => {
				if (error) {
					emitter.emit("error", error);
				} else {
					emitter.emit("close", code);
				}
			});

			return emitter as ChildProcess;
		}),
	};
}

describe("getBundledAssetsDir", () => {
	it("returns a path ending with assets/websculpt-commands", () => {
		const dir = getBundledAssetsDir();
		expect(dir).toMatch(/assets[/\\]websculpt-commands$/);
	});
});

describe("runSetup", () => {
	it("fails when bundled assets directory does not exist", async () => {
		const logger = createLogger({ quiet: true });
		const deps = createMockDeps({ existsSync: false });
		const result = await runSetup({ logger }, deps);

		expect(result.success).toBe(false);
		expect(result.error).toContain("Bundled WebSculpt commands not found");
		expect(deps.spawn).not.toHaveBeenCalled();
	});

	it("fails when websculpt CLI is not available", async () => {
		const logger = createLogger({ quiet: true });
		const deps = createMockDeps({ versionCode: 1 });
		const result = await runSetup({ logger }, deps);

		expect(result.success).toBe(false);
		expect(result.error).toBeTruthy();
		expect(deps.spawn).toHaveBeenCalledTimes(1);
		expect(deps.spawn).toHaveBeenCalledWith("websculpt", ["--version"], expect.any(Object));
	});

	it("succeeds in dry-run mode without running import", async () => {
		const logger = createLogger({ quiet: true });
		const deps = createMockDeps({ versionCode: 0 });
		const result = await runSetup({ dryRun: true, logger }, deps);

		expect(result.success).toBe(true);
		expect(result.assetsDir).toMatch(/assets[/\\]websculpt-commands$/);
		expect(deps.spawn).toHaveBeenCalledTimes(1);
		expect(deps.spawn).toHaveBeenCalledWith("websculpt", ["--version"], expect.any(Object));
	});

	it("runs import and succeeds when websculpt exits with code 0", async () => {
		const logger = createLogger({ quiet: true });
		const deps = createMockDeps({ versionCode: 0, importCode: 0 });
		const result = await runSetup({ logger }, deps);

		expect(result.success).toBe(true);
		expect(deps.spawn).toHaveBeenCalledTimes(2);
		expect(deps.spawn).toHaveBeenLastCalledWith(
			"websculpt",
			["command", "import", "--from", expect.stringContaining("assets")],
			expect.any(Object),
		);
	});

	it("fails when import exits with non-zero code", async () => {
		const logger = createLogger({ quiet: true });
		const deps = createMockDeps({ versionCode: 0, importCode: 2 });
		const result = await runSetup({ logger }, deps);

		expect(result.success).toBe(false);
		expect(result.error).toContain("exited with code 2");
	});

	it("fails when import spawn emits an error", async () => {
		const logger = createLogger({ quiet: true });
		const deps = createMockDeps({ versionCode: 0, importError: new Error("spawn failed") });
		const result = await runSetup({ logger }, deps);

		expect(result.success).toBe(false);
		expect(result.error).toContain("spawn failed");
	});
});
