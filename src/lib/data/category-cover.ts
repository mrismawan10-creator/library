import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { NotFoundError, toDataError } from "./errors";
import { processCover, type CropRect } from "@/lib/media/process";
import { validateImageUpload } from "@/lib/media/validate";
import {
  removeCoverFilesInDir,
  uploadCoverToDir,
} from "@/lib/media/storage";
import { categoryDir } from "@/lib/media/resolve";
import type { CategoryRow } from "@/lib/schemas";

/**
 * Category template cover (FR-08, FR-09).
 *
 * A template is the default cover for every prompt in the category that has no
 * uploaded cover of its own — the second tier of the FR-08 fallback. Same
 * validation and sharp pipeline as a prompt cover, stored under
 * `categories/{id}` and recorded in `template_cover_path`.
 */

async function requireCategory(id: string): Promise<CategoryRow> {
  const { data, error } = await getSupabaseAdmin()
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Category not found.");
  return data as CategoryRow;
}

export async function setCategoryTemplate(
  id: string,
  buffer: Buffer,
  crop?: CropRect,
): Promise<CategoryRow> {
  await requireCategory(id);
  validateImageUpload(buffer);

  const processed = await processCover(buffer, crop);
  const dir = categoryDir(id);
  await uploadCoverToDir(dir, processed);

  const { data, error } = await getSupabaseAdmin()
    .from("categories")
    .update({ template_cover_path: dir })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Category not found.");
  return data as CategoryRow;
}

export async function removeCategoryTemplate(id: string): Promise<CategoryRow> {
  await requireCategory(id);
  await removeCoverFilesInDir(categoryDir(id));

  const { data, error } = await getSupabaseAdmin()
    .from("categories")
    .update({ template_cover_path: null })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Category not found.");
  return data as CategoryRow;
}
