import { NextResponse } from "next/server";
import { uuidSchema } from "@/lib/schemas";
import { NotFoundError } from "@/lib/data/errors";
import { restorePrompt } from "@/lib/data/prompts";
import { handleApiError } from "@/lib/api/response";

/** POST /api/prompts/:id/restore (FR-15). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) throw new NotFoundError("Prompt not found.");
    const prompt = await restorePrompt(id);
    return NextResponse.json({ prompt });
  } catch (error) {
    return handleApiError(error);
  }
}
