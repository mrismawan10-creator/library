import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { slugify, type TagRow } from "@/lib/schemas";
import { ConflictError, NotFoundError, toDataError } from "./errors";

/**
 * Tag handling (FR-10).
 *
 * Uniqueness is case-insensitive and enforced by a unique index on
 * lower(name), so this resolves existing tags by lowercased name before
 * inserting. Empty names never reach the database, and nothing here ever
 * deletes a prompt.
 */

/**
 * Resolves names to tag rows, creating the ones that do not exist yet.
 *
 * Lookup goes through `slug`, not `name`: the slug is lowercase by
 * construction, so it matches the database's case-insensitive uniqueness rule
 * without needing a case-insensitive query. An existing tag keeps the spelling
 * it was created with — typing "prompting" when "Prompting" exists reuses the
 * original rather than renaming it.
 */
async function upsertTags(names: string[]): Promise<TagRow[]> {
  if (names.length === 0) return [];

  const supabase = getSupabaseAdmin();

  const wanted = new Map<string, string>(); // slug -> name as typed
  for (const name of names) {
    const trimmed = name.trim();
    if (trimmed.length === 0) continue;
    const slug = slugify(trimmed);
    if (slug.length === 0) continue; // e.g. punctuation only
    if (!wanted.has(slug)) wanted.set(slug, trimmed);
  }
  if (wanted.size === 0) return [];

  const slugs = [...wanted.keys()];

  const { data: existing, error: selectError } = await supabase
    .from("tags")
    .select("*")
    .in("slug", slugs);
  if (selectError) throw toDataError(selectError);

  const resolved = new Map<string, TagRow>();
  for (const tag of (existing ?? []) as TagRow[]) {
    resolved.set(tag.slug, tag);
  }

  const missing = [...wanted.entries()].filter(([slug]) => !resolved.has(slug));
  if (missing.length > 0) {
    // ignoreDuplicates covers the race where the same tag is created twice.
    const { error: insertError } = await supabase
      .from("tags")
      .upsert(
        missing.map(([slug, name]) => ({ name, slug })),
        { onConflict: "slug", ignoreDuplicates: true },
      );
    if (insertError) throw toDataError(insertError);

    const { data: refetched, error: refetchError } = await supabase
      .from("tags")
      .select("*")
      .in("slug", slugs);
    if (refetchError) throw toDataError(refetchError);
    for (const tag of (refetched ?? []) as TagRow[]) {
      resolved.set(tag.slug, tag);
    }
  }

  return [...resolved.values()];
}

/**
 * Makes a prompt's tag links match `names` exactly: adds what is new, unlinks
 * what was removed. Unlinking leaves the tag row itself in place — orphan
 * cleanup is a separate, explicit action in Settings.
 */
export async function syncPromptTags(
  promptId: string,
  names: string[],
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const tags = await upsertTags(names);
  const tagIds = new Set(tags.map((tag) => tag.id));

  const { data: current, error: currentError } = await supabase
    .from("prompt_tags")
    .select("tag_id")
    .eq("prompt_id", promptId);
  if (currentError) throw toDataError(currentError);

  const currentIds = new Set(
    ((current ?? []) as { tag_id: string }[]).map((row) => row.tag_id),
  );

  const toAdd = [...tagIds].filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !tagIds.has(id));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("prompt_tags")
      .insert(toAdd.map((tagId) => ({ prompt_id: promptId, tag_id: tagId })));
    if (error) throw toDataError(error);
  }

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("prompt_tags")
      .delete()
      .eq("prompt_id", promptId)
      .in("tag_id", toRemove);
    if (error) throw toDataError(error);
  }
}

export type TagWithCount = TagRow & { prompt_count: number };

/** Every tag with how many prompts use it, for the Settings screen (FR-10). */
export async function listTagsWithCounts(): Promise<TagWithCount[]> {
  const supabase = getSupabaseAdmin();

  const [tagsResult, linksResult] = await Promise.all([
    supabase.from("tags").select("*").order("name", { ascending: true }),
    supabase.from("prompt_tags").select("tag_id"),
  ]);

  if (tagsResult.error) throw toDataError(tagsResult.error);
  if (linksResult.error) throw toDataError(linksResult.error);

  const counts = new Map<string, number>();
  for (const row of (linksResult.data ?? []) as { tag_id: string }[]) {
    counts.set(row.tag_id, (counts.get(row.tag_id) ?? 0) + 1);
  }

  return ((tagsResult.data ?? []) as TagRow[]).map((tag) => ({
    ...tag,
    prompt_count: counts.get(tag.id) ?? 0,
  }));
}

/**
 * Renames a tag. The slug is regenerated so case-insensitive uniqueness keeps
 * holding; a collision surfaces as a conflict rather than merging silently.
 */
export async function renameTag(id: string, name: string): Promise<TagRow> {
  const trimmed = name.trim();
  const slug = slugify(trimmed);
  if (!slug) throw new ConflictError("That name cannot be turned into a tag.");

  const { data, error } = await getSupabaseAdmin()
    .from("tags")
    .update({ name: trimmed, slug })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Tag not found.");
  return data as TagRow;
}

/**
 * Deletes a tag. Prompt rows are untouched (FR-10) — only the links go, through
 * the cascade on prompt_tags.
 */
export async function deleteTag(id: string): Promise<void> {
  const { data, error } = await getSupabaseAdmin()
    .from("tags")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Tag not found.");
}

/** Removes every tag no prompt uses. Returns how many were removed. */
export async function deleteUnusedTags(): Promise<number> {
  const tags = await listTagsWithCounts();
  const unused = tags.filter((tag) => tag.prompt_count === 0);
  if (unused.length === 0) return 0;

  const { error } = await getSupabaseAdmin()
    .from("tags")
    .delete()
    .in(
      "id",
      unused.map((tag) => tag.id),
    );

  if (error) throw toDataError(error);
  return unused.length;
}

/** Tag names attached to a prompt, alphabetical. */
export async function getPromptTags(promptId: string): Promise<TagRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("prompt_tags")
    .select("tags(*)")
    .eq("prompt_id", promptId);

  if (error) throw toDataError(error);

  const rows = (data ?? []) as unknown as { tags: TagRow | null }[];
  return rows
    .map((row) => row.tags)
    .filter((tag): tag is TagRow => tag !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** All tags, alphabetical — used by the filter panel. */
export async function listTags(): Promise<TagRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("tags")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw toDataError(error);
  return (data ?? []) as TagRow[];
}
