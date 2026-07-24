import "server-only";

import {
  CONFIDENCE_READY,
  CONFIDENCE_REVIEW,
  generatedMetadataSchema,
  OUTPUT_TYPES,
  type EnrichedRow,
  type GeneratedMetadata,
} from "@/lib/schemas";
import { AI_MODEL, aiConcurrency, getAiClient } from "./client";

/**
 * AI metadata enrichment (doc §10, §11, §12, §15).
 *
 * Each prompt is classified independently, in bounded-concurrency batches with
 * limited retry. One prompt failing never fails the batch: it comes back as an
 * ERROR row the user can retry. The model's reply is parsed against a Zod
 * schema, so a malformed answer degrades to ERROR rather than corrupt data.
 *
 * The prompt text itself is never rewritten — only classified.
 */

export type EnrichContext = {
  categories: string[];
  aiModels: string[];
};

export type EnrichInput = {
  sourceRow: number;
  promptText: string;
  duplicateInFile?: boolean;
  duplicateInDb?: boolean;
};

const SYSTEM_INSTRUCTION = `You are a metadata classification service for a prompt library.

Analyze one AI prompt and return structured metadata as strict JSON.

Requirements:
- Preserve the original prompt. Never rewrite or restate it.
- title: concise and descriptive, in the prompt's dominant language, 100 characters or fewer. Avoid generic titles like "AI Prompt".
- description: one or two sentences describing what the prompt does, in the prompt's language. Do not repeat the whole prompt.
- category: choose the best fit from the supplied existing categories. Only propose a new category when none fit; set matchType to "existing" or "proposed" accordingly. Category matching is case-insensitive.
- outputType: exactly one of the allowed values. If unsure, use "Other".
- aiModel: recommend a model or provider name ONLY when the prompt clearly targets one (e.g. Midjourney, Claude, Veo). n8n is NOT an AI model. If the prompt is model-agnostic, return null.
- tags: 3 to 8 short, normalized tags. Avoid overly generic tags like "ai" or "prompt". Do not just repeat the category.
- variablesEnabled: true if the prompt contains {{placeholder}} style variables, else false.
- confidence: a number from 0 to 1 for category, outputType, and aiModel.
- Return valid JSON only. No markdown, no commentary.`;

function buildUserMessage(promptText: string, ctx: EnrichContext): string {
  return JSON.stringify({
    prompt: promptText,
    existing_categories: ctx.categories,
    allowed_output_types: OUTPUT_TYPES,
    existing_ai_models: ctx.aiModels,
  });
}

/** Strips accidental ```json fences some models add despite instructions. */
function extractJson(content: string): string {
  const trimmed = content.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fence ? fence[1] : trimmed;
}

async function callModel(
  promptText: string,
  ctx: EnrichContext,
): Promise<GeneratedMetadata> {
  const client = getAiClient();

  const completion = await client.chat.completions.create({
    model: AI_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: buildUserMessage(promptText, ctx) },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  if (!content) throw new Error("Empty response from the model.");

  const parsed = JSON.parse(extractJson(content));
  return generatedMetadataSchema.parse(parsed);
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        // Exponential backoff with a little jitter (doc §12).
        const delay = 400 * 2 ** attempt + Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Turns raw AI metadata into a review row, deciding the verdict from confidence
 * on the two critical fields — category and output type (doc §15) — and folding
 * in duplicate flags.
 */
function toEnrichedRow(
  input: EnrichInput,
  ctx: EnrichContext,
  meta: GeneratedMetadata,
): EnrichedRow {
  const warnings: string[] = [];

  const categoryConf = meta.category.confidence;
  const outputConf = meta.outputType.confidence;
  const critical = Math.min(categoryConf, outputConf);

  let status: EnrichedRow["reviewStatus"] = "READY";
  if (input.duplicateInDb || input.duplicateInFile) {
    status = "DUPLICATE";
  } else if (critical < CONFIDENCE_REVIEW) {
    status = "NEEDS_REVIEW";
    warnings.push("Low confidence on category or output type.");
  } else if (critical < CONFIDENCE_READY) {
    status = "NEEDS_REVIEW";
  }

  if (meta.category.matchType === "proposed") {
    warnings.push(`Proposed new category "${meta.category.name}".`);
  }

  // A proposed category has no template yet, so its prompts use the default.
  const categoryHasTemplate = ctx.categories.some(
    (name) => name.toLowerCase() === meta.category.name.toLowerCase(),
  );

  return {
    sourceRow: input.sourceRow,
    promptText: input.promptText,
    title: meta.title,
    description: meta.description,
    categoryName: meta.category.name,
    categoryMatchType: meta.category.matchType,
    outputType: meta.outputType.value,
    aiModel: meta.aiModel.value,
    tags: meta.tags,
    variablesEnabled: meta.variablesEnabled,
    coverMode:
      meta.category.matchType === "existing" && categoryHasTemplate
        ? "CATEGORY_TEMPLATE"
        : "SYSTEM_DEFAULT",
    reviewStatus: status,
    warnings,
  };
}

function errorRow(input: EnrichInput, message: string): EnrichedRow {
  return {
    sourceRow: input.sourceRow,
    promptText: input.promptText,
    title: "",
    description: "",
    categoryName: "Uncategorized",
    categoryMatchType: "existing",
    outputType: "Other",
    aiModel: null,
    tags: [],
    variablesEnabled: false,
    coverMode: "SYSTEM_DEFAULT",
    reviewStatus: "ERROR",
    warnings: [message],
  };
}

/** Enriches one row, never throwing — failure becomes an ERROR row. */
async function enrichOne(
  input: EnrichInput,
  ctx: EnrichContext,
): Promise<EnrichedRow> {
  try {
    const meta = await withRetry(() => callModel(input.promptText, ctx));
    return toEnrichedRow(input, ctx, meta);
  } catch {
    // Never surface a raw provider error — it can carry request detail.
    return errorRow(input, "Metadata generation failed. Retry this row.");
  }
}

/** Enriches many rows with bounded concurrency (doc §12). */
export async function enrichRows(
  inputs: EnrichInput[],
  ctx: EnrichContext,
): Promise<EnrichedRow[]> {
  const results = new Array<EnrichedRow>(inputs.length);
  const limit = aiConcurrency();
  let cursor = 0;

  async function worker() {
    while (cursor < inputs.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await enrichOne(inputs[index], ctx);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, inputs.length) }, worker),
  );

  return results;
}
