import { z } from "zod";
import { outputTypeSchema } from "./prompt";

/**
 * Schemas for the bulk Excel import (docs/update_feature.md).
 *
 * These are the single source of truth for the shapes crossing the wire between
 * the parse, enrich, and commit steps, and for validating the AI's structured
 * output before it is ever trusted. Client and server both import from here.
 */

export const REVIEW_STATUSES = [
  "READY",
  "NEEDS_REVIEW",
  "ERROR",
  "DUPLICATE",
] as const;
export const reviewStatusSchema = z.enum(REVIEW_STATUSES);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

/** Confidence thresholds (doc §15). Kept here so the UI and server agree. */
export const CONFIDENCE_READY = 0.8;
export const CONFIDENCE_REVIEW = 0.5;

/** A row as read from the spreadsheet, before any AI work. */
export const parsedPromptRowSchema = z.object({
  sourceRow: z.number().int().positive(),
  promptText: z.string(),
  /** Set when an identical prompt appears earlier in the same file. */
  duplicateInFile: z.boolean(),
  /** Set when an identical prompt already exists in the library. */
  duplicateInDb: z.boolean(),
});
export type ParsedPromptRow = z.infer<typeof parsedPromptRowSchema>;

export const parseImportResponseSchema = z.object({
  fileName: z.string(),
  totalRows: z.number().int(),
  validPromptRows: z.number().int(),
  emptyRows: z.number().int(),
  duplicatesInFile: z.number().int(),
  rows: z.array(parsedPromptRowSchema),
});
export type ParseImportResponse = z.infer<typeof parseImportResponseSchema>;

/**
 * The AI's per-prompt output. This is what the model is asked to return, and
 * what we parse its response against — an invalid shape becomes an ERROR row
 * rather than corrupt data.
 */
export const generatedMetadataSchema = z.object({
  title: z.string().min(1).max(150),
  description: z.string().max(600),
  category: z.object({
    name: z.string().min(1),
    matchType: z.enum(["existing", "proposed"]),
    confidence: z.number().min(0).max(1),
  }),
  outputType: z.object({
    value: outputTypeSchema,
    confidence: z.number().min(0).max(1),
  }),
  aiModel: z.object({
    value: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  tags: z.array(z.string()).max(12),
  variablesEnabled: z.boolean(),
});
export type GeneratedMetadata = z.infer<typeof generatedMetadataSchema>;

/**
 * A fully processed row: the parsed source plus the (editable) metadata and a
 * review verdict. This is the unit the review table renders and the commit
 * endpoint receives back.
 */
export const enrichedRowSchema = z.object({
  sourceRow: z.number().int().positive(),
  promptText: z.string(),
  title: z.string(),
  description: z.string(),
  categoryName: z.string(),
  categoryMatchType: z.enum(["existing", "proposed"]),
  outputType: outputTypeSchema,
  aiModel: z.string().nullable(),
  tags: z.array(z.string()),
  variablesEnabled: z.boolean(),
  coverMode: z.enum(["CATEGORY_TEMPLATE", "SYSTEM_DEFAULT"]),
  reviewStatus: reviewStatusSchema,
  warnings: z.array(z.string()),
});
export type EnrichedRow = z.infer<typeof enrichedRowSchema>;

/** Request body for POST /api/import/prompts/enrich. */
export const enrichRequestSchema = z.object({
  rows: z
    .array(
      z.object({
        sourceRow: z.number().int().positive(),
        promptText: z.string().min(1),
        duplicateInFile: z.boolean().optional(),
        duplicateInDb: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(1000),
});
export type EnrichRequest = z.infer<typeof enrichRequestSchema>;

/** Request body for POST /api/import/prompts/commit. */
export const commitRequestSchema = z.object({
  rows: z.array(enrichedRowSchema).min(1),
});
export type CommitRequest = z.infer<typeof commitRequestSchema>;

export const importResultSchema = z.object({
  totalSelected: z.number().int(),
  created: z.number().int(),
  skipped: z.number().int(),
  duplicates: z.number().int(),
  failed: z.number().int(),
  categoriesCreated: z.number().int(),
  rows: z.array(
    z.object({
      sourceRow: z.number().int(),
      status: z.enum(["CREATED", "SKIPPED", "FAILED"]),
      promptId: z.string().optional(),
      message: z.string().optional(),
    }),
  ),
});
export type ImportResult = z.infer<typeof importResultSchema>;
