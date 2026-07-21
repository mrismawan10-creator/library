import { z } from "zod";
import { uuidSchema } from "./common";

/**
 * App settings — mirrors PRD §7.5. Exactly one row exists (read-or-create).
 * Both feature flags stay false through the MVP: nothing is built behind them
 * beyond the flags themselves (CLAUDE.md product invariant 13).
 *
 * API keys are never stored here. They live in environment secrets.
 */

export const appSettingsRowSchema = z.object({
  id: uuidSchema,
  prompt_variables_enabled: z.boolean(),
  ai_features_enabled: z.boolean(),
  ai_provider: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const appSettingsUpdateSchema = z.object({
  prompt_variables_enabled: z.boolean().optional(),
  ai_features_enabled: z.boolean().optional(),
});

/** The subset that is safe to include in the JSON export (FR-18). */
export const appSettingsExportSchema = appSettingsRowSchema.pick({
  prompt_variables_enabled: true,
  ai_features_enabled: true,
});

export type AppSettingsRow = z.infer<typeof appSettingsRowSchema>;
export type AppSettingsUpdate = z.infer<typeof appSettingsUpdateSchema>;
export type AppSettingsExport = z.infer<typeof appSettingsExportSchema>;
