/**
 * Lightweight logger abstraction for controlling output verbosity.
 *
 * When `quiet` is true, per-call progress messages are suppressed while
 * final summary and error output are preserved.
 */

export interface Logger {
	log(message: string): void;
	error(message: string): void;
	warn(message: string): void;
	info(message: string): void;
}

export function createLogger(options: { quiet: boolean }): Logger {
	if (options.quiet) {
		return {
			log: () => {},
			error: (m: string) => console.error(m),
			warn: (m: string) => console.error(m),
			info: () => {},
		};
	}
	return {
		log: (m: string) => console.log(m),
		error: (m: string) => console.error(m),
		warn: (m: string) => console.warn(m),
		info: (m: string) => console.log(m),
	};
}

/** Default logger (non-quiet) for convenience. */
export const defaultLogger: Logger = createLogger({ quiet: false });
