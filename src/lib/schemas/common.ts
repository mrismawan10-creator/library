import { z } from "zod";

/**
 * Shared primitives. These schemas are the single source of validation truth
 * for both client and server (CLAUDE.md conventions), so nothing here may import
 * server-only modules.
 */

export const uuidSchema = z.string().uuid();

export const timestampSchema = z.string();

/** A slug: lowercase, digits, single hyphens, no leading or trailing hyphen. */
export const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and single hyphens.",
  );

/**
 * Trims, then treats an empty string as absent. Used for every optional text
 * field so blank inputs are stored as NULL rather than "".
 */
export const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

/** Combining marks that NFKD splits off accented letters. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Derives a slug from a display name. Deterministic; shared client and server. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
