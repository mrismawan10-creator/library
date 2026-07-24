import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { toDataError } from "@/lib/data/errors";
import { syncPromptTags } from "@/lib/data/tags";
import { slugify, type CommitRequest, type ImportResult } from "@/lib/schemas";
import { promptHash } from "./hash";

/**
 * Commits selected import rows (doc §16, §17).
 *
 * Order matters: approved new categories are created first so their names map
 * to ids, then each prompt is inserted with its tags. A prompt already present
 * in the library (by content hash) is skipped, never duplicated. One row
 * failing does not abort the rest — the result reports the outcome per row.
 *
 * Rows arrive already edited and selected by the user; they are validated again
 * at the route with the shared schema before reaching here.
 */
export async function commitImport(
  input: CommitRequest,
): Promise<ImportResult> {
  const supabase = getSupabaseAdmin();
  const rows = input.rows;

  // 1. Load existing categories, matched case-insensitively by name.
  const { data: categoryData, error: categoryError } = await supabase
    .from("categories")
    .select("id, name");
  if (categoryError) throw toDataError(categoryError);

  const categoryByName = new Map<string, string>();
  for (const c of (categoryData ?? []) as { id: string; name: string }[]) {
    categoryByName.set(c.name.toLowerCase(), c.id);
  }

  // 2. Create the approved new categories that do not exist yet.
  let categoriesCreated = 0;
  const wantedNew = new Map<string, string>(); // lower -> display name
  for (const row of rows) {
    const key = row.categoryName.trim().toLowerCase();
    if (!key || key === "uncategorized") continue;
    if (!categoryByName.has(key)) wantedNew.set(key, row.categoryName.trim());
  }

  for (const [key, name] of wantedNew) {
    const { data, error } = await supabase
      .from("categories")
      .insert({ name, slug: slugify(name), show_on_home: true })
      .select("id")
      .single();
    // A concurrent create is fine — re-resolve below.
    if (error) {
      const { data: found } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", name)
        .maybeSingle();
      if (found) {
        categoryByName.set(key, (found as { id: string }).id);
        continue;
      }
      throw toDataError(error);
    }
    categoryByName.set(key, (data as { id: string }).id);
    categoriesCreated += 1;
  }

  // 3. Insert prompts one by one so a single failure is isolated.
  const resultRows: ImportResult["rows"] = [];
  let created = 0;
  let skipped = 0;
  let duplicates = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const hash = promptHash(row.promptText);

      // Skip if it already exists in the library (doc §13.2 default: Skip).
      const { data: existing, error: existingError } = await supabase
        .from("prompts")
        .select("id")
        .eq("prompt_hash", hash)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) {
        duplicates += 1;
        skipped += 1;
        resultRows.push({
          sourceRow: row.sourceRow,
          status: "SKIPPED",
          message: "Already in the library.",
        });
        continue;
      }

      const key = row.categoryName.trim().toLowerCase();
      const categoryId =
        key && key !== "uncategorized" ? categoryByName.get(key) ?? null : null;

      const coverSource =
        row.coverMode === "CATEGORY_TEMPLATE" && categoryId
          ? "category_template"
          : "system_default";

      const { data: inserted, error: insertError } = await supabase
        .from("prompts")
        .insert({
          title: row.title.slice(0, 120),
          prompt_text: row.promptText,
          description: row.description || null,
          category_id: categoryId,
          output_type: row.outputType,
          ai_model: row.aiModel,
          cover_source: coverSource,
          prompt_hash: hash,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      const promptId = (inserted as { id: string }).id;
      if (row.tags.length > 0) await syncPromptTags(promptId, row.tags);

      created += 1;
      resultRows.push({
        sourceRow: row.sourceRow,
        status: "CREATED",
        promptId,
      });
    } catch (error) {
      failed += 1;
      console.error("[import] row failed", row.sourceRow, error);
      resultRows.push({
        sourceRow: row.sourceRow,
        status: "FAILED",
        message: "Could not save this prompt.",
      });
    }
  }

  return {
    totalSelected: rows.length,
    created,
    skipped,
    duplicates,
    failed,
    categoriesCreated,
    rows: resultRows,
  };
}
