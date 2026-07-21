import "server-only";

import { EXCERPT_LENGTH, type PromptCard } from "@/lib/schemas";

/**
 * The shape every list and catalog query selects (PRD §14).
 *
 * `prompt_text` is aliased to `excerpt` and trimmed on the way out, so no list
 * response can carry a full prompt — and a card excerpt can never end up in the
 * clipboard. Both the list queries and the home catalog import this, so the two
 * cannot drift apart.
 */
export const CARD_COLUMNS = `
  id,
  title,
  excerpt:prompt_text,
  category_id,
  output_type,
  ai_model,
  cover_path,
  cover_source,
  is_favorite,
  is_featured,
  status,
  usage_count,
  last_used_at,
  created_at,
  updated_at,
  categories ( name, slug )
`;

export type CardQueryRow = Omit<PromptCard, "category_name" | "category_slug"> & {
  categories: { name: string; slug: string } | null;
};

export function toCard(row: CardQueryRow): PromptCard {
  const { categories, ...rest } = row;
  return {
    ...rest,
    excerpt: row.excerpt.slice(0, EXCERPT_LENGTH),
    category_name: categories?.name ?? null,
    category_slug: categories?.slug ?? null,
  };
}

/** Narrows the untyped PostgREST payload into cards. */
export function toCards(data: unknown): PromptCard[] {
  return ((data ?? []) as CardQueryRow[]).map(toCard);
}
