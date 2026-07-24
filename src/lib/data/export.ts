import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { toDataError } from "./errors";

/**
 * JSON export (FR-18).
 *
 * Includes every prompt (active AND archived), categories, tags, and the safe
 * settings. It must never contain a secret or a binary cover: covers appear as
 * their stored path plus source only. Fields are listed explicitly rather than
 * `select("*")` so a column added later cannot leak into an export by accident.
 */

export const EXPORT_SCHEMA_VERSION = 1;

const PROMPT_FIELDS = [
  "id",
  "title",
  "prompt_text",
  "description",
  "category_id",
  "output_type",
  "ai_model",
  "cover_path",
  "cover_source",
  "is_favorite",
  "is_featured",
  "status",
  "usage_count",
  "last_used_at",
  "created_at",
  "updated_at",
].join(", ");

const CATEGORY_FIELDS = [
  "id",
  "name",
  "slug",
  "description",
  "template_cover_path",
  "sort_order",
  "show_on_home",
  "created_at",
  "updated_at",
].join(", ");

export type ExportBundle = {
  export_metadata: {
    schema_version: number;
    exported_at: string;
    app: string;
  };
  prompts: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  tags: Record<string, unknown>[];
  prompt_tags: { prompt_id: string; tag_id: string }[];
  settings: {
    prompt_variables_enabled: boolean;
    ai_features_enabled: boolean;
  };
};

export async function buildExportBundle(): Promise<ExportBundle> {
  const supabase = getSupabaseAdmin();

  const [prompts, categories, tags, promptTags, settings] = await Promise.all([
    supabase
      .from("prompts")
      .select(PROMPT_FIELDS)
      .order("created_at", { ascending: true }),
    supabase
      .from("categories")
      .select(CATEGORY_FIELDS)
      .order("sort_order", { ascending: true }),
    supabase
      .from("tags")
      .select("id, name, slug, created_at")
      .order("name", { ascending: true }),
    supabase.from("prompt_tags").select("prompt_id, tag_id"),
    // Only the two safe flags. The provider column and any future secret-ish
    // field are never selected.
    supabase
      .from("app_settings")
      .select("prompt_variables_enabled, ai_features_enabled")
      .limit(1)
      .maybeSingle(),
  ]);

  for (const result of [prompts, categories, tags, promptTags, settings]) {
    if (result.error) throw toDataError(result.error);
  }

  const settingsRow =
    (settings.data as {
      prompt_variables_enabled: boolean;
      ai_features_enabled: boolean;
    } | null) ?? {
      prompt_variables_enabled: false,
      ai_features_enabled: false,
    };

  return {
    export_metadata: {
      schema_version: EXPORT_SCHEMA_VERSION,
      exported_at: new Date().toISOString(),
      app: "prompt-library-dashboard",
    },
    prompts: (prompts.data ?? []) as unknown as Record<string, unknown>[],
    categories: (categories.data ?? []) as unknown as Record<string, unknown>[],
    tags: (tags.data ?? []) as unknown as Record<string, unknown>[],
    prompt_tags: (promptTags.data ?? []) as unknown as {
      prompt_id: string;
      tag_id: string;
    }[],
    settings: {
      prompt_variables_enabled: settingsRow.prompt_variables_enabled,
      ai_features_enabled: settingsRow.ai_features_enabled,
    },
  };
}

/** Filename per FR-18: prompt-library-export-YYYY-MM-DD.json. */
export function exportFilename(date = new Date()): string {
  const iso = date.toISOString().slice(0, 10);
  return `prompt-library-export-${iso}.json`;
}
