/**
 * Import constants shared by client and server. No server-only imports here.
 */

export const IMPORT_SHEET_NAME = "Prompts_Input";
export const IMPORT_COLUMN = "prompt_text";

/** Default max prompts per file (doc §4.5). Overridable via IMPORT_MAX_PROMPTS. */
export const DEFAULT_MAX_PROMPTS = 1000;

export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export const IMPORT_TEMPLATE_FILENAME =
  "Prompt_Library_AI_Enrichment_Import_Template.xlsx";

export function maxPromptsPerFile(): number {
  const raw = process.env.IMPORT_MAX_PROMPTS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_PROMPTS;
}
