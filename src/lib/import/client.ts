"use client";

import { ApiError, apiFetch } from "@/lib/api/client";
import type {
  EnrichedRow,
  ImportResult,
  ParseImportResponse,
  ParsedPromptRow,
} from "@/lib/schemas";

/**
 * Browser-side calls for the import flow. Parse is multipart; enrich and commit
 * are JSON. Enrichment is sent in chunks so the UI can show real progress and a
 * single slow provider call cannot stall the whole batch.
 */

const ENRICH_CHUNK = 15;

export async function parseImportFile(
  file: File,
): Promise<ParseImportResponse> {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch("/api/import/prompts/parse", {
    method: "POST",
    body,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      data?.error?.message ?? "Could not read the file.",
      response.status,
      data?.error?.fields,
    );
  }
  return data as ParseImportResponse;
}

/** Enriches rows in chunks, reporting progress as each chunk returns. */
export async function enrichRows(
  rows: ParsedPromptRow[],
  onProgress: (done: number, total: number) => void,
): Promise<EnrichedRow[]> {
  const out: EnrichedRow[] = [];
  for (let i = 0; i < rows.length; i += ENRICH_CHUNK) {
    const chunk = rows.slice(i, i + ENRICH_CHUNK);
    const { rows: enriched } = await apiFetch<{ rows: EnrichedRow[] }>(
      "/api/import/prompts/enrich",
      {
        method: "POST",
        body: JSON.stringify({
          rows: chunk.map((r) => ({
            sourceRow: r.sourceRow,
            promptText: r.promptText,
            duplicateInFile: r.duplicateInFile,
            duplicateInDb: r.duplicateInDb,
          })),
        }),
      },
    );
    out.push(...enriched);
    onProgress(out.length, rows.length);
  }
  return out;
}

export async function commitRows(rows: EnrichedRow[]): Promise<ImportResult> {
  const { result } = await apiFetch<{ result: ImportResult }>(
    "/api/import/prompts/commit",
    { method: "POST", body: JSON.stringify({ rows }) },
  );
  return result;
}
