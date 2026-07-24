import "server-only";

import ExcelJS from "exceljs";
import {
  IMPORT_COLUMN,
  IMPORT_SHEET_NAME,
  maxPromptsPerFile,
} from "./constants";

/**
 * Excel parsing for bulk import (doc §4, §21).
 *
 * Only the `Prompts_Input` sheet and its `prompt_text` column are read; every
 * other sheet is ignored. Security posture:
 *   - Cell values are taken as data. If a cell is a formula, its cached result
 *     is used, never the formula string — a formula is not trusted as input.
 *   - ExcelJS does not execute macros or follow external workbook links.
 *   - Internal line breaks in a prompt are preserved; only the leading and
 *     trailing whitespace of a cell is trimmed. The prompt is never truncated.
 */

export class ImportParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportParseError";
  }
}

export type ParsedExcel = {
  totalRows: number;
  emptyRows: number;
  prompts: { sourceRow: number; promptText: string }[];
};

/** Reads a cell's textual value, resolving formulas to their cached result. */
function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();

  // Rich text: concatenate the runs.
  if (typeof value === "object" && "richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((run) => run.text).join("");
  }
  // Formula cell: use the computed result, never the formula expression.
  if (typeof value === "object" && "result" in value) {
    const result = (value as { result?: unknown }).result;
    return result == null ? "" : String(result);
  }
  // Hyperlink cell: use the visible text, not the target.
  if (typeof value === "object" && "text" in value) {
    return String((value as { text?: unknown }).text ?? "");
  }
  return "";
}

export async function parsePromptExcel(buffer: Buffer): Promise<ParsedExcel> {
  const workbook = new ExcelJS.Workbook();
  try {
    // ExcelJS bundles an older Buffer type than @types/node; the value is a
    // real Buffer at runtime, so cast to the method's expected parameter type.
    type LoadArg = Parameters<typeof workbook.xlsx.load>[0];
    await workbook.xlsx.load(buffer as unknown as LoadArg);
  } catch {
    throw new ImportParseError("The file could not be read as a valid .xlsx workbook.");
  }

  const sheet = workbook.getWorksheet(IMPORT_SHEET_NAME);
  if (!sheet) {
    throw new ImportParseError(`Sheet "${IMPORT_SHEET_NAME}" was not found.`);
  }

  // Locate the prompt_text column from the header row (row 1).
  const header = sheet.getRow(1);
  let column = -1;
  header.eachCell((cell, colNumber) => {
    if (cellText(cell.value).trim().toLowerCase() === IMPORT_COLUMN) {
      column = colNumber;
    }
  });
  if (column === -1) {
    throw new ImportParseError(`Column "${IMPORT_COLUMN}" was not found.`);
  }

  const limit = maxPromptsPerFile();
  const prompts: { sourceRow: number; promptText: string }[] = [];
  let emptyRows = 0;
  let totalRows = 0;

  const lastRow = sheet.rowCount;
  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber += 1) {
    const raw = cellText(sheet.getRow(rowNumber).getCell(column).value);
    const text = raw.trim();
    totalRows += 1;
    if (text.length === 0) {
      emptyRows += 1;
      continue;
    }
    prompts.push({ sourceRow: rowNumber, promptText: text });

    if (prompts.length > limit) {
      throw new ImportParseError(
        `The file contains more than ${limit} prompts.`,
      );
    }
  }

  if (prompts.length === 0) {
    throw new ImportParseError("No prompts were found in the uploaded file.");
  }

  return { totalRows, emptyRows, prompts };
}
