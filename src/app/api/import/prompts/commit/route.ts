import { NextResponse } from "next/server";
import { commitRequestSchema } from "@/lib/schemas";
import { commitImport } from "@/lib/import/commit";
import { handleApiError, readJson } from "@/lib/api/response";

/**
 * POST /api/import/prompts/commit — persist the selected, reviewed rows
 * (doc §17). Validates the payload again server-side before writing.
 */
export async function POST(request: Request) {
  try {
    const input = commitRequestSchema.parse(await readJson(request));
    const result = await commitImport(input);
    return NextResponse.json({ result });
  } catch (error) {
    return handleApiError(error);
  }
}

export const maxDuration = 300;
