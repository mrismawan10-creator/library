import { z } from "zod";
import { uuidSchema } from "./common";

/** Tag schemas — mirrors PRD §7.3 and FR-10. */

export const tagRowSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: z.string(),
  created_at: z.string(),
});

/**
 * A single tag name as typed by the user. Uniqueness is case-insensitive and
 * enforced by the database (unique index on lower(name)); this only guards
 * shape and length.
 */
export const tagNameSchema = z.string().trim().min(1).max(40);

/**
 * A list of tag names from the prompt form. Blank entries are dropped rather
 * than rejected (FR-10: empty tags are never stored), and duplicates that
 * differ only in case collapse to the first spelling entered.
 */
export const tagNameListSchema = z
  .array(z.string())
  .transform((names) => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of names) {
      const name = raw.trim();
      if (name.length === 0) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(name);
    }
    return result;
  })
  .pipe(z.array(tagNameSchema).max(25, "A prompt can carry up to 25 tags."));

export type TagRow = z.infer<typeof tagRowSchema>;
export type TagNameList = z.infer<typeof tagNameListSchema>;
