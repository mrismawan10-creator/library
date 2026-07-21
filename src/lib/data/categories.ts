import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { CategoryRow } from "@/lib/schemas";
import { toDataError } from "./errors";

/**
 * Categories, ordered the way the catalog shows them (FR-01, FR-09).
 * Creation, editing, reordering, and deletion arrive in Milestone 4.
 */
export async function listCategories(): Promise<CategoryRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw toDataError(error);
  return (data ?? []) as CategoryRow[];
}
