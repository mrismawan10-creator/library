import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Server-only by construction:
 * the `server-only` import above makes any client-component import a build error.
 *
 * RLS is enabled with zero policies on every table (deny-all), so this client is
 * the single data path for the whole app. Never return it, its config, or the key
 * from an API response, a log line, or the JSON export.
 */

let client: SupabaseClient | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  client = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: (url, options = {}) =>
          fetch(url, { ...options, cache: "no-store" }),
      },
    },
  );

  return client;
}
