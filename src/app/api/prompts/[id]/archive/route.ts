import { NextResponse } from "next/server";
import { uuidSchema } from "@/lib/schemas";
import { archivePrompt } from "@/lib/data/prompts";
import { handleApiError } from "@/lib/api/response";

/** POST /api/prompts/:id/archive (FR-15). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const prompt = await archivePrompt(uuidSchema.parse(id));
    return NextResponse.json({ prompt });
  } catch (error) {
    return handleApiError(error);
  }
}
