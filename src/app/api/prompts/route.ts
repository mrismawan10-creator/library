import { NextResponse } from "next/server";
import { promptCreateSchema, promptQuerySchema } from "@/lib/schemas";
import { createPrompt, listPrompts } from "@/lib/data/prompts";
import { handleApiError, readJson } from "@/lib/api/response";

/**
 * GET /api/prompts — search, filter, and sort (FR-11, FR-12).
 * Excerpts only, never full text.
 */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const query = promptQuerySchema.parse({
      q: params.get("q") ?? undefined,
      category: params.get("category") ?? undefined,
      tag: params.getAll("tag"),
      type: params.getAll("type"),
      model: params.get("model") ?? undefined,
      favorite: params.get("favorite") ?? undefined,
      featured: params.get("featured") ?? undefined,
      status: params.get("status") ?? undefined,
      sort: params.get("sort") ?? undefined,
    });

    const prompts = await listPrompts({ query });
    return NextResponse.json({ prompts });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/prompts — create (FR-04). */
export async function POST(request: Request) {
  try {
    const input = promptCreateSchema.parse(await readJson(request));
    const prompt = await createPrompt(input);
    return NextResponse.json({ prompt }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
