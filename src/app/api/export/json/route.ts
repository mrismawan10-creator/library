import { NextResponse } from "next/server";
import { buildExportBundle, exportFilename } from "@/lib/data/export";
import { handleApiError } from "@/lib/api/response";

/**
 * GET /api/export/json (FR-18). Streams the whole library as a downloadable
 * JSON file. No secrets, no binary covers — the bundle builder guarantees that.
 */
export async function GET() {
  try {
    const bundle = await buildExportBundle();
    const body = JSON.stringify(bundle, null, 2);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFilename()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
