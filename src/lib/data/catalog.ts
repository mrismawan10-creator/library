import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { CatalogRow, CategoryRow, PromptCardWithCover } from "@/lib/schemas";
import { toDataError } from "./errors";
import { CARD_COLUMNS, toCards } from "./cards";
import { withCoverUrls } from "@/lib/media/resolve";

/**
 * Home catalog queries (FR-01, FR-02).
 *
 * Archived prompts never appear in any of this: not in the hero, not in a row.
 * Like every list query, these select an excerpt rather than the full prompt
 * text (PRD §14).
 */

/** Items shown per row before "See all". */
export const ROW_LIMIT = 12;

/**
 * The hero prompt, chosen by the FR-02 fallback: the featured prompt, else the
 * most recently used favorite, else the newest prompt. Archived is excluded at
 * every step, so archiving the featured prompt simply drops it to the next
 * candidate.
 */
export async function getHeroPrompt(): Promise<PromptCardWithCover | null> {
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
    if (rows.length > 0) return (await withCoverUrls(rows))[0];
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

  const categoryData = await Promise.all(
    categories.map(async (category) => {
      const { data, error } = await base()
        .eq("category_id", category.id)
        .order("created_at", { ascending: false })
        .limit(ROW_LIMIT);
      if (error) throw toDataError(error);
      return { id: category.id, data };
    }),
  );

  const categoryRows = categories.map((category) => ({
    key: `category-${category.slug}`,
    title: category.name,
    categorySlug: category.slug,
    cards: toCards(
      categoryData.find((entry) => entry.id === category.id)?.data,
    ),
  }));

  const rawRows = [
    { key: "recently-added", title: "Recently Added", cards: toCards(recentlyAdded.data) },
    { key: "recently-used", title: "Recently Used", cards: toCards(recentlyUsed.data) },
    { key: "favorites", title: "Favorites", cards: toCards(favorites.data) },
    ...categoryRows,
  ].filter((row) => row.cards.length > 0);

  // Sign every row's covers together so the whole home page costs one signing
  // call rather than one per row.
  const enriched = await withCoverUrls(rawRows.flatMap((row) => row.cards));
  let cursor = 0;
  return rawRows.map((row) => {
    const prompts = enriched.slice(cursor, cursor + row.cards.length);
    cursor += row.cards.length;
    return {
      key: row.key,
      title: row.title,
      categorySlug: "categorySlug" in row ? row.categorySlug : undefined,
      prompts,
    } satisfies CatalogRow;
  });
}
