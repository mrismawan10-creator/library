import { z } from "zod";
import { optionalText, slugSchema, uuidSchema } from "./common";

/** Category schemas — mirrors PRD §7.2 and FR-09. */

export const categoryRowSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  template_cover_path: z.string().nullable(),
  sort_order: z.number().int(),
  show_on_home: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(60),
  slug: slugSchema.optional(),
  description: optionalText,
  sort_order: z.number().int().min(0).optional(),
  show_on_home: z.boolean().optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

/** Payload for FR-09 reorder: the full ordered list of category ids. */
export const categoryReorderSchema = z.object({
  ids: z.array(uuidSchema).min(1),
});

export type CategoryRow = z.infer<typeof categoryRowSchema>;
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
export type CategoryReorder = z.infer<typeof categoryReorderSchema>;
