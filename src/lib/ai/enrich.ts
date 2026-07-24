import "server-only";

import {
  CONFIDENCE_READY,
  CONFIDENCE_REVIEW,
  generatedMetadataSchema,
  OUTPUT_TYPES,
  outputTypeSchema,
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
- Return valid JSON only. No markdown, no commentary.

Return exactly this JSON shape:
{
  "title": "string",
  "description": "string",
  "category": { "name": "string", "matchType": "existing", "confidence": 0.9 },
  "outputType": { "value": "Writing", "confidence": 0.9 },
  "aiModel": { "value": null, "confidence": 0.9 },
  "tags": ["tag1", "tag2"],
  "variablesEnabled": false
}`;

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asConfidence(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
}

/**
 * Coerces a model's raw JSON into the strict metadata shape.
 *
 * Different models return different shapes for the same request — some give
 * `category: "Research"`, others `category: {name, matchType, confidence}`.
 * This accepts either, so the feature works across the varied models a gateway
 * like Sumopod or OpenRouter exposes. When a model gives a bare value with no
 * confidence, we assume reasonable confidence; a model that does report low
 * confidence is still honoured.
 */
function coerceMetadata(
  raw: unknown,
  promptText: string,
  ctx: EnrichContext,
): GeneratedMetadata {
  const obj = asRecord(raw);
  const DEFAULT_CONF = 0.85;

  // category: string or { name, matchType, confidence }
  const rawCategory = obj.category;
  let categoryName: string;
  let categoryConf: number;
  if (typeof rawCategory === "string") {
    categoryName = rawCategory;
    categoryConf = DEFAULT_CONF;
  } else {
    const c = asRecord(rawCategory);
    categoryName = String(c.name ?? obj.categoryName ?? "Uncategorized");
    categoryConf = asConfidence(c.confidence, DEFAULT_CONF);
  }
  const matchType = ctx.categories.some(
    (name) => name.toLowerCase() === categoryName.trim().toLowerCase(),
  )
    ? "existing"
    : "proposed";

  // outputType: string or { value, confidence }; anything unknown → Other.
  const rawOutput = obj.outputType;
  const outputRaw =
    typeof rawOutput === "string" ? rawOutput : asRecord(rawOutput).value;
  const outputParsed = outputTypeSchema.safeParse(outputRaw);
  const outputValue = outputParsed.success ? outputParsed.data : "Other";
  const outputConf =
    typeof rawOutput === "string"
      ? outputParsed.success
        ? DEFAULT_CONF
        : 0.3
      : asConfidence(asRecord(rawOutput).confidence, DEFAULT_CONF);

  // aiModel: string | null or { value, confidence }
  const rawModel = obj.aiModel;
  let modelValue: string | null;
  let modelConf: number;
  if (typeof rawModel === "string") {
    modelValue = rawModel.trim() || null;
    modelConf = DEFAULT_CONF;
  } else if (rawModel == null) {
    modelValue = null;
    modelConf = 1;
  } else {
    const m = asRecord(rawModel);
    modelValue = m.value == null ? null : String(m.value).trim() || null;
    modelConf = asConfidence(m.confidence, DEFAULT_CONF);
  }

  const tags = Array.isArray(obj.tags)
    ? obj.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12)
    : [];

  const variablesEnabled =
    typeof obj.variablesEnabled === "boolean"
      ? obj.variablesEnabled
      : /\{\{[^}]+\}\}/.test(promptText);

  return generatedMetadataSchema.parse({
    title: String(obj.title ?? "").slice(0, 150),
    description: String(obj.description ?? "").slice(0, 600),
    category: { name: categoryName, matchType, confidence: categoryConf },
    outputType: { value: outputValue, confidence: outputConf },
    aiModel: { value: modelValue, confidence: modelConf },
    tags,
    variablesEnabled,
  });
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
  return coerceMetadata(parsed, promptText, ctx);
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
  } catch (error) {
    // Log only the error type, not the full error or the prompt (doc §21).
    const reason = error instanceof Error ? error.name : "unknown";
    console.error(`[ai.enrich] row ${input.sourceRow} failed: ${reason}`);
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
