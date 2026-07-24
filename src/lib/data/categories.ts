import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  slugify,
  type CategoryCreate,
  type CategoryRow,
  type CategoryUpdate,
} from "@/lib/schemas";
import { ConflictError, NotFoundError, toDataError } from "./errors";

/** Category management (FR-09). */

export async function listCategories(): Promise<CategoryRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw toDataError(error);
  return (data ?? []) as CategoryRow[];
}

export type CategoryWithCount = CategoryRow & { prompt_count: number };

/**
 * Categories with how many prompts each holds — the delete confirmation needs
 * that number to say exactly how many prompts become uncategorized.
 */
export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const supabase = getSupabaseAdmin();

  const [categoriesResult, promptsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("prompts").select("category_id"),
  ]);

  if (categoriesResult.error) throw toDataError(categoriesResult.error);
  if (promptsResult.error) throw toDataError(promptsResult.error);

  const counts = new Map<string, number>();
  for (const row of (promptsResult.data ?? []) as { category_id: string | null }[]) {
    if (!row.category_id) continue;
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  return ((categoriesResult.data ?? []) as CategoryRow[]).map((category) => ({
    ...category,
    prompt_count: counts.get(category.id) ?? 0,
  }));
}

export async function createCategory(
  input: CategoryCreate,
): Promise<CategoryRow> {
  const supabase = getSupabaseAdmin();
  const slug = input.slug ?? slugify(input.name);
  if (!slug) throw new ConflictError("That name cannot be turned into a slug.");

  // New categories land at the end of the existing order.
  const { data: last, error: lastError } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw toDataError(lastError);

  const nextOrder =
    input.sort_order ??
    ((last as { sort_order: number } | null)?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: input.name,
      slug,
      description: input.description ?? null,
      sort_order: nextOrder,
      show_on_home: input.show_on_home ?? true,
    })
    .select("*")
    .single();

  if (error) throw toDataError(error);
  return data as CategoryRow;
}

export async function updateCategory(
  id: string,
  input: CategoryUpdate,
): Promise<CategoryRow> {
  const fields: Record<string, unknown> = {};
  if (input.name !== undefined) fields.name = input.name;
  if (input.slug !== undefined) fields.slug = input.slug;
  if (input.description !== undefined) fields.description = input.description;
  if (input.sort_order !== undefined) fields.sort_order = input.sort_order;
  if (input.show_on_home !== undefined) fields.show_on_home = input.show_on_home;

  if (Object.keys(fields).length === 0) {
    const { data, error } = await getSupabaseAdmin()
      .from("categories")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw toDataError(error);
    if (!data) throw new NotFoundError("Category not found.");
    return data as CategoryRow;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("categories")
    .update(fields)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Category not found.");
  return data as CategoryRow;
}

/**
 * Applies a new order, given the full list of ids in the order wanted. The
 * whole reorder happens in one transaction (a Postgres function), so it can
 * never be left half-applied.
 */
export async function reorderCategories(ids: string[]): Promise<CategoryRow[]> {
  const { error } = await getSupabaseAdmin().rpc("reorder_categories", { ids });
  if (error) throw toDataError(error);
  return listCategories();
}

/**
 * Deletes a category (FR-09). Prompts are never deleted with it: the foreign
 * key is `on delete set null`, so they simply become uncategorized.
 */
export async function deleteCategory(id: string): Promise<void> {
  const { data, error } = await getSupabaseAdmin()
    .from("categories")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Category not found.");
}
