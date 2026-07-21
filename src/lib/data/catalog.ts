import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { CategoryRow, PromptCard } from "@/lib/schemas";
import { toDataError } from "./errors";
import { CARD_COLUMNS, toCards } from "./cards";

/**
 * Home catalog queries (FR-01, FR-02).
 *
 * Archived prompts never appear in any of this: not in the hero, not in a row.
 * Like every list query, these select an excerpt rather than the full prompt
 * text (PRD §14).
 */

/** Items shown per row before "See all". */
export const ROW_LIMIT = 12;

export type CatalogRow = {
  key: string;
  title: string;
  /** Present for category rows, so "See all" can link to the right filter. */
  categorySlug?: string;
  prompts: PromptCard[];
};

/**
 * The hero prompt, chosen by the FR-02 fallback: the featured prompt, else the
 * most recently used favorite, else the newest prompt. Archived is excluded at
 * every step, so archiving the featured prompt simply drops it to the next
 * candidate.
 */
export async function getHeroPrompt(): Promise<PromptCard | null> {
  const supabase = getSupabaseAdmin();

  const attempts = [
    () =>
      supabase
        .from("prompts")
        .select(CARD_COLUMNS)
        .eq("status", "active")
        .eq("is_featured", true)
        .limit(1),
    () =>
      supabase
        .from("prompts")
        .select(CARD_COLUMNS)
        .eq("status", "active")
        .eq("is_favorite", true)
        .not("last_used_at", "is", null)
        .order("last_used_at", { ascending: false })
        .limit(1),
    () =>
      supabase
        .from("prompts")
        .select(CARD_COLUMNS)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1),
  ];

  for (const attempt of attempts) {
    const { data, error } = await attempt();
    if (error) throw toDataError(error);
    const rows = toCards(data);
    if (rows.length > 0) return rows[0];
  }

  return null;
}

/**
 * Every row the home page shows, already filtered: empty rows are dropped here
 * rather than hidden in the markup (FR-01), and category rows follow
 * `sort_order`, skipping the ones hidden from home.
 */
export async function getCatalogRows(): Promise<CatalogRow[]> {
  const supabase = getSupabaseAdmin();

  const base = () =>
    supabase.from("prompts").select(CARD_COLUMNS).eq("status", "active");

  const [recentlyAdded, recentlyUsed, favorites, categoriesResult] =
    await Promise.all([
      base().order("created_at", { ascending: false }).limit(ROW_LIMIT),
      base()
        .not("last_used_at", "is", null)
        .order("last_used_at", { ascending: false })
        .limit(ROW_LIMIT),
      base()
        .eq("is_favorite", true)
        .order("created_at", { ascending: false })
        .limit(ROW_LIMIT),
      supabase
        .from("categories")
        .select("*")
        .eq("show_on_home", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

  for (const result of [recentlyAdded, recentlyUsed, favorites, categoriesResult]) {
    if (result.error) throw toDataError(result.error);
  }

  const categories = (categoriesResult.data ?? []) as CategoryRow[];

  const categoryRows = await Promise.all(
    categories.map(async (category) => {
      const { data, error } = await base()
        .eq("category_id", category.id)
        .order("created_at", { ascending: false })
        .limit(ROW_LIMIT);
      if (error) throw toDataError(error);
      return {
        key: `category-${category.slug}`,
        title: category.name,
        categorySlug: category.slug,
        prompts: toCards(data),
      } satisfies CatalogRow;
    }),
  );

  const rows: CatalogRow[] = [
    {
      key: "recently-added",
      title: "Recently Added",
      prompts: toCards(recentlyAdded.data),
    },
    {
      key: "recently-used",
      title: "Recently Used",
      prompts: toCards(recentlyUsed.data),
    },
    {
      key: "favorites",
      title: "Favorites",
      prompts: toCards(favorites.data),
    },
    ...categoryRows,
  ];

  return rows.filter((row) => row.prompts.length > 0);
}
