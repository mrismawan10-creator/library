import { NextResponse } from "next/server";
import { promptFlagSchema, uuidSchema } from "@/lib/schemas";
import { NotFoundError } from "@/lib/data/errors";
import { setFavorite } from "@/lib/data/prompts";
import { handleApiError, readJson } from "@/lib/api/response";

/** POST /api/prompts/:id/favorite (FR-13). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      throw new NotFoundError("Prompt not found.");
    }
    const { value } = promptFlagSchema.parse(await readJson(request));
    const prompt = await setFavorite(id, value);
    return NextResponse.json({ prompt });
  } catch (error) {
    return handleApiError(error);
  }
}
