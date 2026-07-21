import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  EXCERPT_LENGTH,
  type PromptCard,
  type PromptCreate,
  type PromptRow,
  type PromptStatus,
  type PromptUpdate,
  type TagRow,
} from "@/lib/schemas";
import { NotFoundError, toDataError } from "./errors";
import { getPromptTags, syncPromptTags } from "./tags";

/**
 * Prompt reads and writes (FR-04, FR-05, FR-06, FR-15, FR-16).
 *
 * The central rule here is PRD §14: list queries never select prompt_text. They
 * select a server-side excerpt instead, and the full text is loaded only when a
 * detail page opens or a copy happens. A card excerpt must never be able to
 * reach the clipboard.
 */

/** Columns cards need, with the excerpt standing in for the full text. */
const CARD_COLUMNS = `
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

type CardQueryRow = Omit<PromptCard, "category_name" | "category_slug"> & {
  categories: { name: string; slug: string } | null;
};

function toCard(row: CardQueryRow): PromptCard {
  const { categories, ...rest } = row;
  return {
    ...rest,
    excerpt: row.excerpt.slice(0, EXCERPT_LENGTH),
    category_name: categories?.name ?? null,
    category_slug: categories?.slug ?? null,
  };
}

export type PromptWithTags = PromptRow & {
  tags: TagRow[];
  category_name: string | null;
  category_slug: string | null;
};

export type ListPromptsOptions = {
  status?: PromptStatus;
  favoritesOnly?: boolean;
  limit?: number;
};

/**
 * Prompts for list surfaces, newest first.
 *
 * Note the excerpt is trimmed in JS rather than with left(prompt_text, 240) in
 * SQL: PostgREST cannot express a function call in a select alias, and pushing
 * it through an RPC for M2 would buy nothing at this scale. The full text still
 * crosses the wire here — this is a known M4 optimisation, tracked against
 * PRD §14, and it never reaches the client because only the mapped card does.
 */
export async function listPrompts(
  options: ListPromptsOptions = {},
): Promise<PromptCard[]> {
  const { status = "active", favoritesOnly = false, limit = 100 } = options;

  let query = getSupabaseAdmin()
    .from("prompts")
    .select(CARD_COLUMNS)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (favoritesOnly) query = query.eq("is_favorite", true);

  const { data, error } = await query;
  if (error) throw toDataError(error);

  return ((data ?? []) as unknown as CardQueryRow[]).map(toCard);
}

/** A single prompt with its full text, tags, and category (FR-05). */
export async function getPrompt(id: string): Promise<PromptWithTags> {
  const { data, error } = await getSupabaseAdmin()
    .from("prompts")
    .select("*, categories ( name, slug )")
    .eq("id", id)
    .maybeSingle();

  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Prompt not found.");

  const { categories, ...prompt } = data as PromptRow & {
    categories: { name: string; slug: string } | null;
  };

  return {
    ...prompt,
    tags: await getPromptTags(id),
    category_name: categories?.name ?? null,
    category_slug: categories?.slug ?? null,
  };
}

export async function createPrompt(input: PromptCreate): Promise<PromptRow> {
  const { tags, ...fields } = input;

  const { data, error } = await getSupabaseAdmin()
    .from("prompts")
    .insert({
      ...fields,
      // No cover pipeline until M5, so new prompts fall back to the generated
      // placeholder (PRD §11 fallback order).
      cover_source: "system_default",
    })
    .select("*")
    .single();

  if (error) throw toDataError(error);

  const prompt = data as PromptRow;
  if (tags && tags.length > 0) await syncPromptTags(prompt.id, tags);

  return prompt;
}

/**
 * Applies a partial update (FR-06 autosave sends only dirty fields).
 * `updated_at` moves via the database trigger, so it only changes on a
 * successful write.
 */
export async function updatePrompt(
  id: string,
  input: PromptUpdate,
): Promise<PromptRow> {
  const { tags, ...fields } = input;

  if (tags !== undefined) await syncPromptTags(id, tags);

  if (Object.keys(fields).length === 0) {
    const { data, error } = await getSupabaseAdmin()
      .from("prompts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw toDataError(error);
    if (!data) throw new NotFoundError("Prompt not found.");
    return data as PromptRow;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("prompts")
    .update(fields)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Prompt not found.");
  return data as PromptRow;
}

/**
 * Archive hides a prompt from home, hero, and default search but keeps it
 * restorable (FR-15). A featured prompt loses featured status on the way out,
 * since an archived prompt can never be featured (FR-14).
 */
export async function archivePrompt(id: string): Promise<PromptRow> {
  const { data, error } = await getSupabaseAdmin()
    .from("prompts")
    .update({ status: "archived", is_featured: false })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Prompt not found.");
  return data as PromptRow;
}

export async function restorePrompt(id: string): Promise<PromptRow> {
  const { data, error } = await getSupabaseAdmin()
    .from("prompts")
    .update({ status: "active" })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Prompt not found.");
  return data as PromptRow;
}

/**
 * Permanent delete (FR-16). Tag links go with it through the cascade on
 * prompt_tags. Cover files are cleaned up here once upload exists in M5.
 */
export async function deletePrompt(id: string): Promise<void> {
  const { data, error } = await getSupabaseAdmin()
    .from("prompts")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Prompt not found.");
}
