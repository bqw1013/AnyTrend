import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const CLI_ENTRY = "src/cli.ts";

function runCli(args: string[]): { stdout: string; stderr: string; status: number | null } {
	const result = spawnSync("npx", ["tsx", CLI_ENTRY, ...args], {
		encoding: "utf-8",
		timeout: 15_000,
		shell: process.platform === "win32",
	});
	return {
		stdout: result.stdout || "",
		stderr: result.stderr || "",
		status: result.status,
	};
}

describe("CLI argument parsing", () => {
	it("shows version with --version", () => {
		const { stdout, status } = runCli(["--version"]);
		expect(status).toBe(0);
		expect(stdout).toBeTruthy();
		// Version should be a semver-like string
		expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
	});

	it("shows help with --help", () => {
		const { stdout, status } = runCli(["--help"]);
		expect(status).toBe(0);
		expect(stdout).toContain("Usage:");
		expect(stdout).toContain("anytrend");
		expect(stdout).toContain("Commands:");
	});

	it("shows command help for collect", () => {
		const { stdout, status } = runCli(["collect", "--help"]);
		expect(status).toBe(0);
		expect(stdout).toContain("Usage:");
		expect(stdout).toContain("--archive-date");
		expect(stdout).toContain("--concurrency");
		expect(stdout).toContain("--delay");
	});

	it("shows command help for build", () => {
		const { stdout, status } = runCli(["build", "--help"]);
		expect(status).toBe(0);
		expect(stdout).toContain("--archive-date");
		expect(stdout).toContain("--skip-collect");
		expect(stdout).toContain("--skip-normalize");
	});

	it("shows command help for normalize", () => {
		const { stdout, status } = runCli(["normalize", "--help"]);
		expect(status).toBe(0);
		expect(stdout).toContain("--input");
		expect(stdout).toContain("--output");
	});

	it("shows command help for normalize-batch", () => {
		const { stdout, status } = runCli(["normalize-batch", "--help"]);
		expect(status).toBe(0);
		expect(stdout).toContain("--input");
		expect(stdout).toContain("--output");
	});

	it("shows command help for merge", () => {
		const { stdout, status } = runCli(["merge", "--help"]);
		expect(status).toBe(0);
		expect(stdout).toContain("--input");
		expect(stdout).toContain("--output");
	});

	it("shows command help for doctor", () => {
		const { stdout, status } = runCli(["doctor", "--help"]);
		expect(status).toBe(0);
		expect(stdout).toContain("Verify");
	});

	it("shows command help for setup", () => {
		const { stdout, status } = runCli(["setup", "--help"]);
		expect(status).toBe(0);
		expect(stdout).toContain("Usage:");
		expect(stdout).toContain("--dry-run");
	});

	it("shows command help for sources", () => {
		const { stdout, status } = runCli(["sources", "--help"]);
		expect(status).toBe(0);
		expect(stdout).toContain("Collection plan");
	});

	it("shows command help for sources list", () => {
		const { stdout, status } = runCli(["sources", "list", "--help"]);
		expect(status).toBe(0);
		expect(stdout).toContain("Display");
	});

	it("rejects invalid option values with helpful error", () => {
		const { status } = runCli(["collect", "--concurrency", "not-a-number"]);
		// Commander should exit non-zero on invalid option
		if (status !== null) {
			expect(status).not.toBe(0);
		}
	});

	it("rejects legacy normalize options --raw/--out", () => {
		const { status } = runCli(["normalize", "--raw", "in.json", "--out", "out.json"]);
		expect(status).not.toBe(0);
	});

	it("rejects legacy normalize-batch options --input-dir/--output-dir", () => {
		const { status } = runCli(["normalize-batch", "--input-dir", "in", "--output-dir", "out"]);
		expect(status).not.toBe(0);
	});

	it("rejects legacy merge options --input-dir/--output-dir", () => {
		const { status } = runCli(["merge", "--input-dir", "in", "--output-dir", "out"]);
		expect(status).not.toBe(0);
	});

	it("accepts --no-color flag without error", () => {
		const { status } = runCli(["--no-color", "--help"]);
		expect(status).toBe(0);
	});

	it("accepts --quiet flag without error", () => {
		const { status } = runCli(["--quiet", "--help"]);
		expect(status).toBe(0);
	});
});

describe("CLI --quiet mode", () => {
	it("--help works with --quiet", () => {
		const { stdout, status } = runCli(["--quiet", "--help"]);
		expect(status).toBe(0);
		expect(stdout).toContain("Usage:");
	});
});

describe("CLI doctor smoke test", () => {
	it("doctor runs without crashing", () => {
		const { stdout, status } = runCli(["doctor"]);
		// Doctor reports status even if websculpt is not installed
		expect(stdout).toBeTruthy();
		// Should mention environment checks
		expect(stdout).toContain("Node.js");
		// No hard crash
		if (status !== null) {
			// Doctor exits 0 or 1 depending on environment — both are valid
			expect([0, 1]).toContain(status);
		}
	}, 20_000);
});

describe("CLI sources list smoke test", () => {
	it("sources list runs without crashing", () => {
		const { stdout, status } = runCli(["sources", "list"]);
		expect(status).toBe(0);
		expect(stdout).toContain("Command");
		expect(stdout).toContain("Angle");
		expect(stdout).toContain("Browser");
		expect(stdout).toContain("Login");
	});
});
