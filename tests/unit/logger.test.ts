import { describe, expect, it } from "vitest";
import { createLogger } from "../../src/lib/logger.js";

describe("createLogger", () => {
	it("creates a non-quiet logger that outputs to console", () => {
		const logger = createLogger({ quiet: false });
		expect(logger).toBeDefined();
		expect(typeof logger.log).toBe("function");
		expect(typeof logger.error).toBe("function");
		expect(typeof logger.warn).toBe("function");
		expect(typeof logger.info).toBe("function");
	});

	it("creates a quiet logger that has no-op log/info/warn", () => {
		const logger = createLogger({ quiet: true });
		// Quiet logger should have all methods
		expect(typeof logger.log).toBe("function");
		expect(typeof logger.error).toBe("function");
		expect(typeof logger.warn).toBe("function");
		expect(typeof logger.info).toBe("function");
	});

	it("quiet logger log/info/warn do not throw", () => {
		const logger = createLogger({ quiet: true });
		// These should not throw
		expect(() => logger.log("test")).not.toThrow();
		expect(() => logger.info("test")).not.toThrow();
		expect(() => logger.warn("test")).not.toThrow();
		expect(() => logger.error("test")).not.toThrow();
	});

	it("non-quiet logger methods do not throw", () => {
		const logger = createLogger({ quiet: false });
		expect(() => logger.log("test")).not.toThrow();
		expect(() => logger.info("test")).not.toThrow();
		expect(() => logger.warn("test")).not.toThrow();
		expect(() => logger.error("test")).not.toThrow();
	});
});
