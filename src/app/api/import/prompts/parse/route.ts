import { NextResponse } from "next/server";
import { parsePromptExcel, ImportParseError } from "@/lib/import/excel";
import { flagDuplicates } from "@/lib/import/dedupe";
import { MAX_IMPORT_FILE_BYTES } from "@/lib/import/constants";
import { handleApiError, jsonError } from "@/lib/api/response";
import type { ParseImportResponse } from "@/lib/schemas";

/**
 * POST /api/import/prompts/parse — read the .xlsx and flag duplicates (doc §7).
 * multipart/form-data with a `file` field. No AI here; enrichment is a separate
 * step so the user sees the parse result immediately.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return jsonError("No file was provided.", 422, {
        file: "Choose an .xlsx file to import.",
      });
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return jsonError("Only .xlsx files are supported.", 422, {
        file: "The file must be an .xlsx spreadsheet.",
      });
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      return jsonError("The file is too large (max 10 MB).", 422, {
        file: "The file is too large (max 10 MB).",
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parsePromptExcel(buffer);
    const rows = await flagDuplicates(parsed.prompts);

    const response: ParseImportResponse = {
      fileName: file.name,
      totalRows: parsed.totalRows,
      validPromptRows: rows.length,
      emptyRows: parsed.emptyRows,
      duplicatesInFile: rows.filter((r) => r.duplicateInFile).length,
      rows,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof ImportParseError) {
      return jsonError(error.message, 422);
    }
    return handleApiError(error);
  }
}
