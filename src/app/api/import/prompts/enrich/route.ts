import { NextResponse } from "next/server";
import { enrichRequestSchema } from "@/lib/schemas";
import { enrichRows } from "@/lib/ai/enrich";
import { getEnrichContext } from "@/lib/import/context";
import { isAiConfigured } from "@/lib/ai/client";
import { handleApiError, jsonError, readJson } from "@/lib/api/response";

/**
 * POST /api/import/prompts/enrich — generate metadata for a batch of rows
 * (doc §8, §12). The client sends rows in batches and merges results, so this
 * also serves the per-row "retry".
 */
export async function POST(request: Request) {
  try {
    if (!isAiConfigured()) {
      return jsonError(
        "AI is not configured on the server. Set AI_API_KEY to use import enrichment.",
        503,
      );
    }

    const { rows } = enrichRequestSchema.parse(await readJson(request));
    const context = await getEnrichContext();
    const enriched = await enrichRows(rows, context);

    return NextResponse.json({ rows: enriched });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Enrichment can take a while for a large batch. */
export const maxDuration = 300;
