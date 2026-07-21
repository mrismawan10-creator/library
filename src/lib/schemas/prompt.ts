import { z } from "zod";
import { optionalText, uuidSchema } from "./common";
import { tagNameListSchema } from "./tag";

/** Prompt schemas — mirrors PRD §7.1, FR-04, and FR-05. */

/** PRD §21.4. */
export const TITLE_MAX_LENGTH = 120;

/** PRD §14: the excerpt cards use, never the full text. */
export const EXCERPT_LENGTH = 240;

/**
 * FR-04: the initial output types. This list lives in the app, not the
 * database, so it can grow without a migration.
 */
export const OUTPUT_TYPES = [
  "Image",
  "Video",
  "Writing",
  "Report",
  "Infographic",
  "Presentation",
  "Coding",
  "Automation",
  "Research",
  "Audio",
  "Other",
] as const;

export const outputTypeSchema = z.enum(OUTPUT_TYPES);

/** FR-08: `ai_generated` is reserved for the AI phase and unused in the MVP. */
export const COVER_SOURCES = [
  "upload",
  "category_template",
  "system_default",
  "ai_generated",
] as const;

export const coverSourceSchema = z.enum(COVER_SOURCES);

export const promptStatusSchema = z.enum(["active", "archived"]);

/** A full prompt row as stored (PRD §7.1). */
export const promptRowSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  prompt_text: z.string(),
  description: z.string().nullable(),
  category_id: uuidSchema.nullable(),
  output_type: z.string(),
  ai_model: z.string().nullable(),
  cover_path: z.string().nullable(),
  cover_source: z.string().nullable(),
  is_favorite: z.boolean(),
  is_featured: z.boolean(),
  status: promptStatusSchema,
  usage_count: z.number().int(),
  last_used_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * What list and catalog queries select (PRD §14). Deliberately carries `excerpt`
 * instead of `prompt_text`: the full text is fetched only on detail open or on
 * copy, and a card excerpt must never reach the clipboard.
 */
export const promptCardSchema = promptRowSchema
  .omit({ prompt_text: true, description: true })
  .extend({
    excerpt: z.string(),
    category_name: z.string().nullable(),
    category_slug: z.string().nullable(),
  });

export const promptCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(TITLE_MAX_LENGTH, `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`),
  prompt_text: z.string().min(1, "Prompt text is required."),
  description: optionalText,
  category_id: uuidSchema.nullable().optional(),
  output_type: outputTypeSchema,
  ai_model: optionalText,
  tags: tagNameListSchema.optional(),
  is_favorite: z.boolean().optional(),
  is_featured: z.boolean().optional(),
});

/**
 * Every field is optional so autosave can PATCH just what changed (FR-06).
 * `status` is excluded on purpose: archive and restore have their own endpoints.
 */
export const promptUpdateSchema = promptCreateSchema.partial();

/**
 * What the prompt form binds to. Same rules as `promptCreateSchema`, except
 * tags are a single free-text field there and get split into names on submit.
 * Keeping it derived means the form can never drift from the API contract.
 */
export const promptFormSchema = promptCreateSchema
  .omit({ tags: true, is_favorite: true, is_featured: true })
  .extend({
    description: z.string(),
    ai_model: z.string(),
    category_id: z.string(),
    tags_input: z.string(),
  });

export type PromptFormValues = z.input<typeof promptFormSchema>;

export type PromptRow = z.infer<typeof promptRowSchema>;
export type PromptCard = z.infer<typeof promptCardSchema>;
export type PromptCreate = z.infer<typeof promptCreateSchema>;
export type PromptUpdate = z.infer<typeof promptUpdateSchema>;
export type OutputType = z.infer<typeof outputTypeSchema>;
export type CoverSource = z.infer<typeof coverSourceSchema>;
export type PromptStatus = z.infer<typeof promptStatusSchema>;
