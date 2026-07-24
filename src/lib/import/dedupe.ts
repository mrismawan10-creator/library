import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { toDataError } from "@/lib/data/errors";
import { promptHash } from "./hash";
import type { ParsedPromptRow } from "@/lib/schemas";

/**
 * Duplicate detection for import (doc §13).
 *
 * Two independent checks, both over the normalised content hash so trivial
 * spacing differences do not hide a duplicate:
 *   - in-file: the same prompt appearing on more than one row
 *   - in-database: the prompt already existing in the library
 *
 * The stored prompt text is never altered — this only sets flags for review.
 */
export async function flagDuplicates(
  prompts: { sourceRow: number; promptText: string }[],
): Promise<ParsedPromptRow[]> {
  const hashes = prompts.map((p) => promptHash(p.promptText));

  // In-file: a hash is a duplicate from its second occurrence onward.
  const seen = new Set<string>();
  const dupeInFile = hashes.map((hash) => {
    const already = seen.has(hash);
    seen.add(hash);
    return already;
  });

  // In-database: one query for all distinct hashes present in the file.
  const distinct = [...new Set(hashes)];
  const existing = new Set<string>();
  if (distinct.length > 0) {
    const { data, error } = await getSupabaseAdmin()
      .from("prompts")
      .select("prompt_hash")
      .in("prompt_hash", distinct);
    if (error) throw toDataError(error);
    for (const row of (data ?? []) as { prompt_hash: string | null }[]) {
      if (row.prompt_hash) existing.add(row.prompt_hash);
    }
  }

  return prompts.map((prompt, index) => ({
    sourceRow: prompt.sourceRow,
    promptText: prompt.promptText,
    duplicateInFile: dupeInFile[index],
    duplicateInDb: existing.has(hashes[index]),
  }));
}
