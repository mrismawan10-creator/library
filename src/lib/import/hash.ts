import "server-only";

import { createHash } from "node:crypto";

/**
 * Content hash for duplicate detection (doc §13).
 *
 * Normalisation must stay byte-identical to the SQL backfill in the
 * prompt_hash migration (`md5(regexp_replace(btrim(prompt_text), '\s+', ' ',
 * 'g'))`), so a prompt created by the app and one backfilled in the database
 * hash to the same value. This only affects the derived hash — the stored
 * prompt_text keeps its original spacing and line breaks.
 */

export function normalizePromptForHash(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function promptHash(text: string): string {
  return createHash("md5").update(normalizePromptForHash(text)).digest("hex");
}
