import { NextResponse } from "next/server";
import { uuidSchema } from "@/lib/schemas";
import { NotFoundError } from "@/lib/data/errors";
import { resetCoverToTemplate } from "@/lib/data/cover";
import { handleApiError } from "@/lib/api/response";

/** POST /api/prompts/:id/cover/reset — back to the category template (FR-08). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      throw new NotFoundError("Prompt not found.");
    }
    const prompt = await resetCoverToTemplate(id);
    return NextResponse.json({ prompt });
  } catch (error) {
    return handleApiError(error);
  }
}
