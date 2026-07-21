import { NextResponse } from "next/server";
import { deleteUnusedTags } from "@/lib/data/tags";
import { handleApiError } from "@/lib/api/response";

/**
 * POST /api/tags/cleanup — removes every tag no prompt uses (FR-10).
 * Prompts are never affected.
 */
export async function POST() {
  try {
    const removed = await deleteUnusedTags();
    return NextResponse.json({ removed });
  } catch (error) {
    return handleApiError(error);
  }
}
