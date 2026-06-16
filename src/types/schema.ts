import { z } from "zod";

export const categorySchema = z.enum(["zh-general", "en-general", "zh-ai", "en-ai"]);

export const boardTypeSchema = z.enum(["hot-search", "trending", "top", "latest", "feed", "papers"]);

export const languageSchema = z.enum(["zh", "en"]);

export const rawErrorSchema = z.object({
	code: z.string(),
	message: z.string(),
});

export const responseMetaSchema = z.object({
	success: z.boolean(),
	duration: z.number().nullable(),
	raw_total: z.number().nullable(),
	error: rawErrorSchema.nullable(),
});

export const normalizedItemSchema = z.object({
	id: z.string(),
	rank: z.number().nullable(),
	title: z.string(),
	url: z.string().nullable(),
	heat: z.string().nullable(),
	heat_raw: z.number().nullable(),
	summary: z.string().nullable(),
	tags: z.array(z.string()),
});

export const adapterOutputSchema = z.object({
	command: z.string(),
	platform: z.string(),
	language: languageSchema,
	category: categorySchema,
	board_type: boardTypeSchema,
	response_meta: responseMetaSchema,
	items: z.array(normalizedItemSchema),
});

export const normalizedOutputSchema = adapterOutputSchema.extend({
	version: z.string(),
	generated_at: z.string(),
});

export type AdapterOutputValidated = z.infer<typeof adapterOutputSchema>;
export type NormalizedOutputValidated = z.infer<typeof normalizedOutputSchema>;
