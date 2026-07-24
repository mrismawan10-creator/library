import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { NotFoundError, toDataError } from "./errors";
import { processCover, type CropRect } from "@/lib/media/process";
import { validateImageUpload } from "@/lib/media/validate";
import { removeCoverFiles, uploadCover } from "@/lib/media/storage";
import { promptDir } from "@/lib/media/resolve";
import type { PromptRow } from "@/lib/schemas";

/**
 * Cover operations for a prompt (FR-08). Every path here keeps storage and the
 * database in step: after any change, cover_path/cover_source describe exactly
 * what is in the bucket, and superseded files are gone.
 */

async function requirePrompt(id: string): Promise<PromptRow> {
  const { data, error } = await getSupabaseAdmin()
    .from("prompts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Prompt not found.");
  return data as PromptRow;
}

/**
 * Validates, processes, stores, and records an uploaded cover. The buffer has
 * already left the request; validation here is the real gate (magic bytes,
 * size, decodability), not the client's filename or Content-Type.
 */
export async function setUploadedCover(
  id: string,
  buffer: Buffer,
  crop?: CropRect,
): Promise<PromptRow> {
  await requirePrompt(id);
  validateImageUpload(buffer);

  const processed = await processCover(buffer, crop);
  await uploadCover(id, processed);

  const { data, error } = await getSupabaseAdmin()
    .from("prompts")
    .update({ cover_path: promptDir(id), cover_source: "upload" })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Prompt not found.");
  return data as PromptRow;
}

/**
 * Removes the custom cover and its files, dropping the prompt back to the
 * category template or the system default (FR-08 fallback).
 */
export async function removeCover(id: string): Promise<PromptRow> {
  await requirePrompt(id);
  await removeCoverFiles(id);

  const { data, error } = await getSupabaseAdmin()
    .from("prompts")
    .update({ cover_path: null, cover_source: "system_default" })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Prompt not found.");
  return data as PromptRow;
}

/**
 * Resets to the category template (FR-08). With no custom files to keep, this
 * is the same end state as remove, but named for intent: it marks the cover as
 * coming from the category rather than a bare default.
 */
export async function resetCoverToTemplate(id: string): Promise<PromptRow> {
  const prompt = await requirePrompt(id);
  await removeCoverFiles(id);

  const source = prompt.category_id ? "category_template" : "system_default";

  const { data, error } = await getSupabaseAdmin()
    .from("prompts")
    .update({ cover_path: null, cover_source: source })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw toDataError(error);
  if (!data) throw new NotFoundError("Prompt not found.");
  return data as PromptRow;
}
