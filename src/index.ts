/**
 * AnyTrend public API entry point.
 *
 * Exports the core types, collection configuration, adapter discovery,
 * normalize/merge runners, and environment diagnostics used by the AnyTrend CLI.
 */

// Adapter layer
export * from "./adapters/index.js";
// Collection configuration
export * from "./config/collect-plan.js";
// Library runners and utilities
export * from "./lib/collect-daily.js";
export * from "./lib/digest-renderer.js";
export * from "./lib/doctor.js";
export * from "./lib/logger.js";
export * from "./lib/merge-normalized.js";
export * from "./lib/normalize.js";
export * from "./lib/runner.js";
export * from "./lib/sources.js";
// Core types and schemas
export * from "./types/index.js";
export * from "./types/schema.js";
