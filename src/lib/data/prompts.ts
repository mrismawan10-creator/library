import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  normalizeOutputTypes,
  type PromptCard,
  type PromptCreate,
  type PromptQuery,
  type PromptRow,
  type PromptUpdate,
  type TagRow,
} from "@/lib/schemas";
import { NotFoundError, toDataError } from "./errors";
import { getPromptTags, syncPromptTags } from "./tags";
import { withCoverUrls, type PromptCardWithCover } from "@/lib/media/resolve";
import { removeCoverFiles, signCoverUrl } from "@/lib/media/storage";
import { promptHash } from "@/lib/import/hash";

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
  /** Resolved cover for the detail hero, following the FR-08 fallback. */
  poster_url: string | null;
};

/** Resolves the detail poster through the same fallback the catalog uses. */
async function resolvePosterUrl(
  prompt: PromptRow,
  categoryId: string | null,
): Promise<string | null> {
  if (prompt.cover_source === "upload" && prompt.cover_path) {
    return signCoverUrl(`${prompt.cover_path}/poster.webp`);
  }
  if (categoryId) {
    const { data } = await getSupabaseAdmin()
      .from("categories")
      .select("template_cover_path")
      .eq("id", categoryId)
      .maybeSingle();
    const template = (data as { template_cover_path: string | null } | null)
      ?.template_cover_path;
    if (template) return signCoverUrl(`${template}/poster.webp`);
  }
  return null;
}

export type ListPromptsOptions = {
  query?: PromptQuery;
  limit?: number;
  offset?: number;
};

/**
 * Every list surface goes through `search_prompts` (FR-11, FR-12): all prompts,
 * favorites, archived, category pages, search results.
 *
 * The function cuts the excerpt with left(prompt_text, 240) in SQL, so full
 * prompt text never leaves the database for a list query (PRD §14). Slugs are
 * resolved to ids first because the function filters on ids.
 */
export async function listPrompts(
  options: ListPromptsOptions = {},
): Promise<PromptCardWithCover[]> {
  const { query = {}, limit = 100, offset = 0 } = options;
  const supabase = getSupabaseAdmin();

  let categoryId: string | null = null;
  if (query.category) {
    const { data, error } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", query.category)
      .maybeSingle();
    if (error) throw toDataError(error);
    if (!data) return []; // unknown category: no results, not an error
    categoryId = (data as { id: string }).id;
  }

  let tagIds: string[] | null = null;
  if (query.tag?.length) {
    const { data, error } = await supabase
      .from("tags")
      .select("id")
      .in("slug", query.tag);
    if (error) throw toDataError(error);
    const ids = ((data ?? []) as { id: string }[]).map((row) => row.id);
    // An unknown tag cannot match anything, so neither can the combination.
    if (ids.length !== query.tag.length) return [];
    tagIds = ids;
  }

  const { data, error } = await supabase.rpc("search_prompts", {
    p_q: query.q ?? null,
    p_category_id: categoryId,
    p_tag_ids: tagIds,
    p_output_types: normalizeOutputTypes(query.type) ?? null,
    p_ai_model: query.model ?? null,
    p_favorite: query.favorite ?? null,
    p_featured: query.featured ?? null,
    p_status: query.status ?? "active",
    p_sort: query.sort ?? "newest",
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw toDataError(error);
  return withCoverUrls((data ?? []) as PromptCard[]);
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

  const [tags, poster_url] = await Promise.all([
    getPromptTags(id),
    resolvePosterUrl(prompt as PromptRow, prompt.category_id),
  ]);

  return {
    ...prompt,
    tags,
    category_name: categories?.name ?? null,
    category_slug: categories?.slug ?? null,
    poster_url,
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
      prompt_hash: promptHash(fields.prompt_text),
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

  // Keep the dedup hash in step whenever the text itself changes.
  const fieldsWithHash: Record<string, unknown> = { ...fields };
  if (typeof fields.prompt_text === "string") {
    fieldsWithHash.prompt_hash = promptHash(fields.prompt_text);
  }

  if (Object.keys(fieldsWithHash).length === 0) {
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
    .update(fieldsWithHash)
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
 * prompt_tags; the custom cover files are removed here.
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

  // The row is gone; a leftover cover file is now orphaned. Failing to clean it
  // up should not turn a successful delete into an error, so it is best-effort.
  try {
    await removeCoverFiles(id);
  } catch (cleanupError) {
    console.error("[data] cover cleanup after delete failed", id, cleanupError);
  }
}
