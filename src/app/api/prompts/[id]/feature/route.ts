import { NextResponse } from "next/server";
import { promptFlagSchema, uuidSchema } from "@/lib/schemas";
import { NotFoundError } from "@/lib/data/errors";
import { setFeatured } from "@/lib/data/prompts";
import { handleApiError, readJson } from "@/lib/api/response";

/**
 * POST /api/prompts/:id/feature (FR-14).
 *
 * The only way to set featured. A generic PATCH cannot do it, because the swap
 * has to un-feature the previous prompt in the same transaction.
 */
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
    const prompt = await setFeatured(id, value);
    return NextResponse.json({ prompt });
  } catch (error) {
    return handleApiError(error);
  }
}
