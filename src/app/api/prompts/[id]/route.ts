import { NextResponse } from "next/server";
import { promptUpdateSchema, uuidSchema } from "@/lib/schemas";
import { NotFoundError } from "@/lib/data/errors";
import { deletePrompt, getPrompt, updatePrompt } from "@/lib/data/prompts";
import { handleApiError, readJson } from "@/lib/api/response";

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/prompts/:id — the full prompt including prompt_text. This is what
 * the copy flow fetches (FR-07) and what the detail page renders.
 */
export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) throw new NotFoundError("Prompt not found.");
    const prompt = await getPrompt(id);
    return NextResponse.json({ prompt });
  } catch (error) {
    return handleApiError(error);
  }
}

/** PATCH /api/prompts/:id — autosave and manual save send only dirty fields. */
export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) throw new NotFoundError("Prompt not found.");
    const input = promptUpdateSchema.parse(await readJson(request));
    const prompt = await updatePrompt(id, input);
    return NextResponse.json({ prompt });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/prompts/:id — permanent (FR-16). The client confirms first. */
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) throw new NotFoundError("Prompt not found.");
    await deletePrompt(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
