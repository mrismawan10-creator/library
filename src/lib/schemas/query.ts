import { z } from "zod";
import { outputTypeSchema } from "./prompt";

/**
 * Discovery state (FR-11, FR-12).
 *
 * This lives in the URL, not in component state: results stay bookmarkable and
 * shareable, the back button behaves, and the page can render on the server.
 * The same schema parses `searchParams` on a page and the query string on
 * `GET /api/prompts`, so the two can never disagree.
 */

export const SORT_OPTIONS = [
  "newest",
  "oldest",
  "recently_updated",
  "recently_used",
  "most_used",
  "alphabetical",
  "favorites_first",
] as const;

export const sortSchema = z.enum(SORT_OPTIONS);

export const SORT_LABELS: Record<Sort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  recently_updated: "Recently updated",
  recently_used: "Recently used",
  most_used: "Most used",
  alphabetical: "A–Z",
  favorites_first: "Favorites first",
};

/** Archived is excluded unless explicitly asked for (FR-11). */
export const queryStatusSchema = z.enum(["active", "archived", "all"]);

/** Accepts `?tag=a&tag=b` and `?tag=a,b` alike. */
const listParam = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const raw = Array.isArray(value) ? value : [value];
    const items = raw
      .flatMap((entry) => entry.split(","))
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return items.length > 0 ? items : undefined;
  });

const booleanParam = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  });

/**
 * Every field is optional and every malformed value falls back rather than
 * throwing: a hand-edited URL should degrade to sensible results, not a 500.
 */
export const promptQuerySchema = z.object({
  q: z.string().trim().max(200).optional().catch(undefined),
  category: z.string().trim().optional().catch(undefined),
  tag: listParam.catch(undefined),
  type: listParam.catch(undefined),
  model: z.string().trim().optional().catch(undefined),
  favorite: booleanParam.catch(undefined),
  featured: booleanParam.catch(undefined),
  status: queryStatusSchema.optional().catch(undefined),
  sort: sortSchema.optional().catch(undefined),
});

export type PromptQuery = z.infer<typeof promptQuerySchema>;
export type Sort = z.infer<typeof sortSchema>;
export type QueryStatus = z.infer<typeof queryStatusSchema>;

/** Keeps only the output types the app knows about. */
export function normalizeOutputTypes(values?: string[]): string[] | undefined {
  if (!values) return undefined;
  const valid = values.filter(
    (value) => outputTypeSchema.safeParse(value).success,
  );
  return valid.length > 0 ? valid : undefined;
}

/** True when anything narrows the results, i.e. "Reset all" is worth showing. */
export function hasActiveFilters(query: PromptQuery): boolean {
  return Boolean(
    query.q ||
      query.category ||
      query.tag?.length ||
      query.type?.length ||
      query.model ||
      query.favorite !== undefined ||
      query.featured !== undefined ||
      (query.status && query.status !== "active"),
  );
}

/** Serialises a query back into a URL search string, omitting defaults. */
export function toSearchParams(query: PromptQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  for (const tag of query.tag ?? []) params.append("tag", tag);
  for (const type of query.type ?? []) params.append("type", type);
  if (query.model) params.set("model", query.model);
  if (query.favorite !== undefined) params.set("favorite", String(query.favorite));
  if (query.featured !== undefined) params.set("featured", String(query.featured));
  if (query.status && query.status !== "active") params.set("status", query.status);
  if (query.sort && query.sort !== "newest") params.set("sort", query.sort);
  return params.toString();
}
