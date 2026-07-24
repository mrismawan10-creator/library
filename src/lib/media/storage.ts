import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { DataError } from "@/lib/data/errors";
import type { ProcessedCover } from "./process";

/**
 * Cover storage in the private `prompt-covers` bucket (PRD §8).
 *
 * Files are served only through short-lived signed URLs — the bucket is not
 * public. Filenames are fixed by us (poster.webp, thumbnail.webp under the
 * prompt id), so nothing user-supplied reaches a path. Superseded files are
 * removed on every replace, remove, and delete.
 */

export const COVER_BUCKET = "prompt-covers";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

const filesIn = (dir: string) => ({
  poster: `${dir}/poster.webp`,
  thumbnail: `${dir}/thumbnail.webp`,
});

/**
 * Stores a processed cover under a directory, overwriting any previous
 * poster/thumbnail. The directory is `prompts/{id}` for a prompt cover or
 * `categories/{id}` for a category template — both fixed by us, never from user
 * input.
 */
export async function uploadCoverToDir(
  dir: string,
  cover: ProcessedCover,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const paths = filesIn(dir);

  const results = await Promise.all([
    supabase.storage.from(COVER_BUCKET).upload(paths.poster, cover.poster, {
      contentType: "image/webp",
      upsert: true,
    }),
    supabase.storage
      .from(COVER_BUCKET)
      .upload(paths.thumbnail, cover.thumbnail, {
        contentType: "image/webp",
        upsert: true,
      }),
  ]);

  for (const result of results) {
    if (result.error) throw new DataError("Could not store the cover.");
  }
}

/** Removes both cover files under a directory. Safe if none exist. */
export async function removeCoverFilesInDir(dir: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const paths = filesIn(dir);

  const { error } = await supabase.storage
    .from(COVER_BUCKET)
    .remove([paths.poster, paths.thumbnail]);

  // A missing file is not an error here — remove is meant to be idempotent.
  if (error && !/not.*found/i.test(error.message)) {
    throw new DataError("Could not remove the old cover.");
  }
}

/** Prompt-cover wrappers over the directory helpers. */
export const uploadCover = (promptId: string, cover: ProcessedCover) =>
  uploadCoverToDir(`prompts/${promptId}`, cover);

export const removeCoverFiles = (promptId: string) =>
  removeCoverFilesInDir(`prompts/${promptId}`);

/**
 * A signed URL for a stored object, or null if it cannot be signed (e.g. the
 * file is gone). Callers fall back to the placeholder, so a null is not fatal.
 */
export async function signCoverUrl(path: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(COVER_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return null;
  return data.signedUrl;
}
