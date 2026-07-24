import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { COVER_BUCKET } from "./storage";
import type { PromptCard, PromptCardWithCover } from "@/lib/schemas";

/**
 * Resolves each prompt to its cover URLs, applying the FR-08 fallback order:
 * uploaded cover → category template → system default (the generated
 * placeholder from M1). `ai_generated` is reserved and never used here.
 *
 * A prompt in the "system default" tier gets null URLs, and the Cover component
 * falls back to the placeholder. So there is always something to show, and a
 * missing or expired file degrades to the placeholder rather than a broken box.
 */

export type { PromptCardWithCover };

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Base dirs: uploads live under the prompt, templates under the category. */
const promptDir = (id: string) => `prompts/${id}`;
const categoryDir = (id: string) => `categories/${id}`;

type Tier =
  | { kind: "none" }
  | { kind: "path"; posterPath: string; thumbnailPath: string };

/**
 * Attaches signed cover URLs to a list of cards in as few round trips as
 * possible: one category lookup for templates, then a single batch signing call
 * per bucket.
 */
export async function withCoverUrls(
  cards: PromptCard[],
): Promise<PromptCardWithCover[]> {
  if (cards.length === 0) return [];

  const supabase = getSupabaseAdmin();

  // Templates are only consulted for prompts without an uploaded cover.
  const categoryIds = new Set<string>();
  for (const card of cards) {
    if (card.cover_source !== "upload" && card.category_id) {
      categoryIds.add(card.category_id);
    }
  }

  const templates = new Map<string, string | null>();
  if (categoryIds.size > 0) {
    const { data } = await supabase
      .from("categories")
      .select("id, template_cover_path")
      .in("id", [...categoryIds]);
    for (const row of (data ?? []) as {
      id: string;
      template_cover_path: string | null;
    }[]) {
      templates.set(row.id, row.template_cover_path);
    }
  }

  const tierFor = (card: PromptCard): Tier => {
    if (card.cover_source === "upload" && card.cover_path) {
      const dir = card.cover_path;
      return {
        kind: "path",
        posterPath: `${dir}/poster.webp`,
        thumbnailPath: `${dir}/thumbnail.webp`,
      };
    }
    if (card.category_id) {
      const template = templates.get(card.category_id);
      if (template) {
        return {
          kind: "path",
          posterPath: `${template}/poster.webp`,
          thumbnailPath: `${template}/thumbnail.webp`,
        };
      }
    }
    return { kind: "none" };
  };

  // Collect every path that needs signing, then sign once.
  const tiers = cards.map(tierFor);
  const paths = new Set<string>();
  for (const tier of tiers) {
    if (tier.kind === "path") {
      paths.add(tier.posterPath);
      paths.add(tier.thumbnailPath);
    }
  }

  const signed = new Map<string, string>();
  if (paths.size > 0) {
    const { data } = await supabase.storage
      .from(COVER_BUCKET)
      .createSignedUrls([...paths], SIGNED_URL_TTL_SECONDS);
    for (const entry of data ?? []) {
      if (entry.signedUrl && entry.path) signed.set(entry.path, entry.signedUrl);
    }
  }

  return cards.map((card, index) => {
    const tier = tiers[index];
    if (tier.kind === "none") {
      return { ...card, poster_url: null, thumbnail_url: null };
    }
    return {
      ...card,
      poster_url: signed.get(tier.posterPath) ?? null,
      thumbnail_url: signed.get(tier.thumbnailPath) ?? null,
    };
  });
}

export { promptDir, categoryDir };
