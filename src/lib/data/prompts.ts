import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  type PromptCard,
  type PromptCreate,
  type PromptRow,
  type PromptStatus,
  type PromptUpdate,
  type TagRow,
} from "@/lib/schemas";
import { NotFoundError, toDataError } from "./errors";
import { CARD_COLUMNS, toCards } from "./cards";
import { getPromptTags, syncPromptTags } from "./tags";

/**
 * Prompt reads and writes (FR-04, FR-05, FR-06, FR-15, FR-16).
 *
 * The central rule here is PRD §14: list queries never select prompt_text. They
 * select a server-side excerpt instead, and the full text is loaded only when a
 * detail page opens or a copy happens. A card excerpt must never be able to
 * reach the clipboard.
 */

export type PromptWithTags = PromptRow & {
  tags: TagRow[];
  category_name: string | null;
  category_slug: string | null;
};

export type ListPromptsOptions = {
  status?: PromptStatus;
  favoritesOnly?: boolean;
  /** Category slug, from the catalog See all links. */
  categorySlug?: string;
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
  const {
    status = "active",
    favoritesOnly = false,
    categorySlug,
    limit = 100,
  } = options;

  const supabase = getSupabaseAdmin();

  // Resolved to an id first: filtering on an embedded column would need an
  // inner join, and without one PostgREST returns every row with the relation
  // nulled instead of filtering.
  let categoryId: string | null = null;
  if (categorySlug) {
    const { data, error } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (error) throw toDataError(error);
    if (!data) return [];
    categoryId = (data as { id: string }).id;
  }

  let query = supabase
    .from("prompts")
    .select(CARD_COLUMNS)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (favoritesOnly) query = query.eq("is_favorite", true);
  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  if (error) throw toDataError(error);

  return toCards(data);
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
 * Records a successful copy (FR-07): usage_count + 1 and last_used_at = now().
 *
 * Deliberately does not touch `updated_at` — copying is not editing, and the
 * detail page shows both. The increment runs in SQL so two quick copies cannot
 * read-modify-write over each other.
 */
export async function recordCopyEvent(id: string): Promise<void> {
  const { data, error } = await getSupabaseAdmin().rpc("record_copy_event", {
    target: id,
  });

  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Prompt not found.");
}

/** Favorite toggle (FR-13). Works on archived prompts too; they just stay hidden. */
export async function setFavorite(
  id: string,
  value: boolean,
): Promise<PromptRow> {
  const { data, error } = await getSupabaseAdmin()
    .from("prompts")
    .update({ is_favorite: value })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Prompt not found.");
  return data as PromptRow;
}

/**
 * Featured toggle (FR-14).
 *
 * Setting one goes through the `set_featured_prompt` function so the un-feature
 * and the feature happen in a single transaction; clearing one is a plain
 * update because it cannot violate the single-featured rule.
 */
export async function setFeatured(
  id: string,
  value: boolean,
): Promise<PromptRow> {
  const supabase = getSupabaseAdmin();

  if (!value) {
    const { data, error } = await supabase
      .from("prompts")
      .update({ is_featured: false })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) throw toDataError(error);
    if (!data) throw new NotFoundError("Prompt not found.");
    return data as PromptRow;
  }

  const { data, error } = await supabase.rpc("set_featured_prompt", {
    target: id,
  });

  if (error) {
    if (error.code === "P0002") throw new NotFoundError("Prompt not found.");
    throw toDataError(error);
  }

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
