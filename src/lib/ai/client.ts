import "server-only";

import OpenAI from "openai";

/**
 * AI client (docs/update_feature.md §11).
 *
 * Provider-agnostic by design: OpenRouter and Sumopod both speak the OpenAI
 * Chat Completions API, so a single OpenAI SDK pointed at a configurable
 * baseURL serves any of them. Switching provider or model is an env change, not
 * a code change — matching the provider-abstraction intent of PRD §FR-20.
 *
 * All of this is server-only. The API key never reaches the client, is never
 * logged, and is never returned in a response.
 */

export const AI_MODEL = process.env.AI_MODEL ?? "openai/gpt-4o-mini";

/**
 * Model used for image understanding (image-to-prompt). Defaults to the text
 * model, which for gpt-4o-mini is already vision-capable; set AI_VISION_MODEL
 * to point at a stronger vision model (e.g. gpt-4o) without touching the text
 * enrichment model.
 */
export const AI_VISION_MODEL =
  process.env.AI_VISION_MODEL ?? process.env.AI_MODEL ?? "openai/gpt-4o-mini";

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

let client: OpenAI | null = null;

export function getAiClient(): OpenAI {
  if (!isAiConfigured()) {
    throw new Error("AI is not configured. Set AI_API_KEY (and AI_BASE_URL).");
  }
  if (client) return client;

  client = new OpenAI({
    apiKey: process.env.AI_API_KEY,
    // OpenRouter: https://openrouter.ai/api/v1 · Sumopod: their /v1 base.
    baseURL: process.env.AI_BASE_URL ?? "https://openrouter.ai/api/v1",
    // A per-request timeout guards against a provider hanging (doc §21).
    timeout: 60_000,
    maxRetries: 0, // retries are handled by the enrichment layer with backoff
  });

  return client;
}

/** Concurrency for enrichment batches (doc §12). Overridable via env. */
export function aiConcurrency(): number {
  const raw = process.env.AI_CONCURRENCY;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(Math.max(parsed, 1), 10);
}
