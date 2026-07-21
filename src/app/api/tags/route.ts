import { NextResponse } from "next/server";
import { listTagsWithCounts } from "@/lib/data/tags";
import { handleApiError } from "@/lib/api/response";

/** GET /api/tags — every tag with its usage count, for Settings. */
export async function GET() {
  try {
    const tags = await listTagsWithCounts();
    return NextResponse.json({ tags });
  } catch (error) {
    return handleApiError(error);
  }
}
