/**
 * Adapter factory — eliminates boilerplate across platform adapters.
 *
 * Each adapter now only declares its metadata and a `mapItem` callback;
 * the factory handles failure branches, response_meta assembly, item
 * iteration, filtering, and output construction.
 */

import type {
	AdapterModule,
	AdapterOutput,
	BoardType,
	Category,
	Language,
	NormalizedItem,
	RawInput,
} from "../types/index.js";
import { buildResponseMeta, getDataObject } from "./utils.js";

// ---------------------------------------------------------------------------
// ItemContext
// ---------------------------------------------------------------------------

export interface ItemContext {
	/** Platform identifier (e.g. "baidu", "github"). */
	platform: string;
	/** Resolved variant string (used for generating ids). */
	variant: string;
	/** Zero-based index of this entry within the items array. */
	index: number;
	/** The full raw input (useful when an adapter needs extra metadata). */
	raw: RawInput;
	/** The resolved data object (raw.data as a Record). */
	data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// AdapterConfig
// ---------------------------------------------------------------------------

export interface AdapterConfig {
	/** WebSculpt command name, e.g. "baidu/get-hot". */
	command: string;
	/** Platform identifier, e.g. "baidu". */
	platform: string;
	/** Content language. */
	language: Language;
	/** Content category. */
	category: Category;
	/** Board type — either a static value or a function resolved at normalize time. */
	board_type: BoardType | ((raw: RawInput, data: Record<string, unknown>, items: unknown[]) => BoardType);

	/**
	 * How to derive the variant string from raw input.
	 *
	 * The variant is used when generating item ids.
	 * Default: returns `"_"`.
	 */
	variant?: (raw: RawInput, data: Record<string, unknown>) => string;

	/**
	 * How to extract the raw items array from `raw.data`.
	 *
	 * Default: `data.items ?? []`.
	 */
	items?: (raw: RawInput, data: Record<string, unknown>) => unknown[];

	/**
	 * Maps a single raw entry to a NormalizedItem.
	 *
	 * Return `null` to skip (filter) this entry.
	 */
	mapItem: (entry: Record<string, unknown>, context: ItemContext) => NormalizedItem | null;
}

// ---------------------------------------------------------------------------
// defineAdapter
// ---------------------------------------------------------------------------

export function defineAdapter(config: AdapterConfig): AdapterModule {
	const {
		command,
		platform,
		language,
		category,
		board_type,
		variant: resolveVariant,
		items: resolveItems,
		mapItem,
	} = config;

	// Cache resolved board_type (for function-based configs, resolved lazily on first call)
	let resolvedBoardTypeCache: BoardType | null = null;

	function resolveBoardType(raw: RawInput, data: Record<string, unknown>, rawItems: unknown[]): BoardType {
		if (typeof board_type !== "function") return board_type;
		const resolved = board_type(raw, data, rawItems);
		resolvedBoardTypeCache = resolved;
		return resolved;
	}

	function normalize(raw: RawInput): AdapterOutput {
		const responseMeta = buildResponseMeta(raw);
		const data = getDataObject(raw);
		const rawItems = resolveItems ? resolveItems(raw, data) : ((data.items as unknown[] | undefined) ?? []);
		const effectiveBoardType = resolveBoardType(raw, data, rawItems);

		if (!raw.success) {
			return {
				command: raw.command ?? command,
				platform,
				language,
				category,
				board_type: effectiveBoardType,
				response_meta: responseMeta,
				items: [],
			};
		}

		const variant = resolveVariant ? resolveVariant(raw, data) : "_";

		const items: NormalizedItem[] = [];

		for (const [index, entry] of rawItems.entries()) {
			if (!isPlainEntry(entry)) {
				continue;
			}

			const ctx: ItemContext = { platform, variant, index, raw, data };
			const mapped = mapItem(entry, ctx);
			if (mapped) {
				items.push(mapped);
			}
		}

		return {
			command: raw.command ?? command,
			platform,
			language,
			category,
			board_type: effectiveBoardType,
			response_meta: responseMeta,
			items,
		};
	}

	return {
		PLATFORM: platform,
		LANGUAGE: language,
		CATEGORY: category,
		get BOARD_TYPE(): BoardType {
			return resolvedBoardTypeCache ?? (typeof board_type === "function" ? "hot-search" : board_type);
		},
		normalize,
	};
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isPlainEntry(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
