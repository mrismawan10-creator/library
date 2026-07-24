import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { toDataError } from "@/lib/data/errors";
import type { EnrichContext } from "@/lib/ai/enrich";

/**
 * Gathers the context the AI classifier needs: the active category names it may
 * choose from (doc §10.3) and the AI models already in use, so it reuses
 * existing spellings rather than inventing variants.
 */
export async function getEnrichContext(): Promise<EnrichContext> {
  const supabase = getSupabaseAdmin();

  const [categories, models] = await Promise.all([
    supabase.from("categories").select("name").order("sort_order"),
    supabase.from("prompts").select("ai_model").not("ai_model", "is", null),
  ]);

  if (categories.error) throw toDataError(categories.error);
  if (models.error) throw toDataError(models.error);

  const aiModels = [
    ...new Set(
      ((models.data ?? []) as { ai_model: string | null }[])
        .map((row) => row.ai_model)
        .filter((model): model is string => Boolean(model)),
    ),
  ];

  return {
    categories: ((categories.data ?? []) as { name: string }[]).map(
      (row) => row.name,
    ),
    aiModels,
  };
}
