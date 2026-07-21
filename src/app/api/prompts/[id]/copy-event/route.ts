import { NextResponse } from "next/server";
import { uuidSchema } from "@/lib/schemas";
import { NotFoundError } from "@/lib/data/errors";
import { recordCopyEvent } from "@/lib/data/prompts";
import { handleApiError } from "@/lib/api/response";

/**
 * POST /api/prompts/:id/copy-event (FR-07).
 *
 * The client sends this fire-and-forget after a successful clipboard write and
 * never waits on it: a tracking failure must not undo or delay a copy that
 * already happened. Answers 204 so there is nothing to parse.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      throw new NotFoundError("Prompt not found.");
    }
    await recordCopyEvent(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
