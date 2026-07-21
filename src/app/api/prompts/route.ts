import { NextResponse } from "next/server";
import { promptCreateSchema, promptStatusSchema } from "@/lib/schemas";
import { createPrompt, listPrompts } from "@/lib/data/prompts";
import { handleApiError, readJson } from "@/lib/api/response";

/** GET /api/prompts — list surfaces (PRD §9). Excerpts only, never full text. */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const status = promptStatusSchema
      .catch("active")
      .parse(params.get("status") ?? "active");

    const prompts = await listPrompts({
      status,
      favoritesOnly: params.get("favorite") === "true",
    });

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
