# CLAUDE.md

Prompt Library Dashboard. Personal, single-user, responsive web app: a streaming-catalog-style visual library for storing, finding, copying, and editing AI prompts. AI-agnostic: the app never executes prompts. No authentication in MVP; privacy comes from private deployment.

Source of truth: `docs/PRD.md` (FR-01..FR-20, schema, endpoints, priorities). Background: `docs/pra-kickoff.md`. If these files are missing, ask the owner for them before making product decisions.

## Stack (locked)

- Next.js (App Router) + TypeScript (strict). Server Components by default; `"use client"` only where interactivity is required.
- Tailwind CSS v4, with shadcn/ui (New York style) on Radix primitives.
- UI libraries in use: sonner (toasts), vaul (mobile sheets/drawers), embla-carousel-react (horizontal category rows), react-hook-form + @hookform/resolvers, lucide-react, date-fns.
- Supabase: PostgreSQL + Storage, accessed ONLY from server code.
- Zod for validation on client and server (shared schemas, e.g. `lib/schemas/`).
- sharp (server-side) for cover processing.
- Deployment: local first. When deploying: Vercel + Basic Auth middleware gated by env vars. Public deployment without protection is forbidden.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint (`eslint .`; `next lint` is deprecated in Next 15 and removed in 16)
- `npm run typecheck` — `tsc --noEmit`

Keep this section updated as scripts are added. Run lint + typecheck before declaring any task done.

## Security rules (never break)

1. `SUPABASE_SERVICE_ROLE_KEY` exists only on the server. Never import server-only modules into client components. Never log it, return it in API responses, or include it in the JSON export.
2. RLS is enabled on every table with zero policies (deny-all). All reads/writes go through route handlers or server actions using the service-role client. The anon key is not used for data access in MVP.
3. Validate uploads server-side: images only (check magic bytes, not just extension), max 10 MB, strip EXIF metadata, normalize filenames.
4. Parameterized queries only. Never build raw SQL from user input.
5. Never commit `.env*`. API responses must never contain secrets.

## Product invariants (P0 behavior, from the PRD)

1. Copy always copies the FULL `prompt_text` with line breaks preserved. Card excerpts never affect clipboard content.
2. Copy flow from cards: fetch full text → write clipboard → POST `/api/prompts/:id/copy-event` fire-and-forget (`usage_count` +1, `last_used_at` updated). Tracking failure must never block or undo the copy. Clipboard failure shows a fallback (modal with selectable full text).
3. Covers are always 2:3. Fallback order in MVP: uploaded cover → category template → system default. AI-generated covers are NOT part of MVP (ignore the PRD §11 fallback line that mentions them).
4. Exactly one prompt may have `is_featured = true`, enforced by a partial unique index; setting a new featured un-features the old one in the same transaction. Archived prompts cannot be featured.
5. Hero selection: featured → most recently used favorite → newest. Never an archived prompt.
6. Archive hides a prompt from home, hero, and default search, but keeps it restorable under `/archived`. Delete is permanent: prompt + tag relations + custom cover files, after a confirmation modal that shows the prompt title. No restore.
7. Autosave: debounce 1500 ms after typing stops. Statuses: Unsaved / Saving / Saved / Failed. Manual Save forces an immediate write and returns to read-only mode. On failure: keep editor state, offer Retry, warn before unload. `updated_at` changes only on successful writes.
8. Tags are case-insensitively unique (unique index on `lower(name)`); empty tags are never stored; tag cleanup never deletes prompts.
9. Deleting a category sets `prompts.category_id` to NULL (uncategorized) after confirmation. Never cascade delete to prompts.
10. Home/list queries never select full `prompt_text`; select an excerpt (`left(prompt_text, 240)`). Full text is fetched on detail open or on copy.
11. Empty category rows are hidden. Rows follow `categories.sort_order`. Archived prompts never appear in Recently Added / Recently Used / Favorites.
12. JSON export includes schema version, timestamp, all prompts (active AND archived), categories, tags, and safe settings. Never secrets, never binary cover files (paths/metadata only). Filename: `prompt-library-export-YYYY-MM-DD.json`.
13. Feature flags in `app_settings` (`prompt_variables_enabled`, `ai_features_enabled`) default to false. Build nothing behind them in MVP beyond the flags themselves.

## Database

Schema per PRD §7: `prompts`, `categories`, `tags`, `prompt_tags`, `app_settings` (singleton row, read-or-create). Do NOT create `prompt_artifacts` yet (future phase). Schema changes happen only through migrations in `supabase/migrations/`.

Required constraints/indexes beyond the PRD text:

- `create unique index one_featured_prompt on prompts (is_featured) where is_featured = true;`
- unique index on `tags (lower(name))`
- `prompts.category_id references categories(id) on delete set null`
- `prompt_tags` foreign keys `on delete cascade`
- check constraint `status in ('active','archived')`
- `pg_trgm` GIN indexes on `prompts.title`, `prompts.prompt_text`, `prompts.description`

## Search

`ILIKE` + `pg_trgm` across title, prompt_text, description, tags, category name, output_type, ai_model. Case-insensitive, debounced input, archived excluded by default. Do NOT use Postgres full-text search configs: content is mixed Indonesian/English and the English stemmer mangles Indonesian. No embeddings or vector search. Scale target is only 100–1,000 prompts.

## Storage (covers)

Private bucket `prompt-covers`. Paths: `prompts/{prompt_id}/original.{ext}`, `poster.webp` (2:3), `thumbnail.webp`. Generate poster + thumbnail with sharp on the server; do not rely on Supabase image transformations. Serve via signed URLs. On replace/remove/delete, clean up superseded files. `cover_source` ∈ `upload | category_template | system_default` (`ai_generated` reserved, unused in MVP).

## Known gotchas

- iOS Safari clipboard: `navigator.clipboard.writeText` after an `await fetch(...)` can lose the user gesture and fail. Use `ClipboardItem` with a Promise for the text, and always keep the manual-copy fallback. UAT-11 depends on this.
- `app_settings` must always resolve to exactly one row.
- Prompt text is plain text: preserve line breaks in storage, in detail view (`white-space: pre-wrap`), and in the clipboard.
- No version history exists: autosave overwrites the active record. Make save statuses unmissable.

## UI direction (PRD §12–13, Pra-Kickoff §15)

Near-black background with deep emerald/teal tint, mint/cyan accents for primary actions, white serif headlines, sans-serif body/UI, subtle glassmorphism on secondary surfaces only. 2:3 poster cards in horizontal category rows with a hero on top. Every page implements loading / empty / error / success states (PRD §11). Mobile: single column, drawer or bottom nav, 44×44 px touch targets, tap alternatives for hover-only actions. Accessibility: WCAG AA contrast, full keyboard operability, visible focus, alt text on covers, labeled icon buttons, reduced-motion support.

## Build order

Follow PRD §17 milestones strictly, P0 scope only (PRD §16):
M1 Foundation (scaffold, Supabase, migrations, design tokens, app shell) → M2 Prompt CRUD + autosave → M3 Catalog (hero, cards, category rows, favorites, copy tracking) → M4 Discovery (search, filter, sort, category/tag management) → M5 Media & backup (cover upload, crop, templates, JSON export) → M6 Stabilization (responsive, a11y, performance, error handling, security review, UAT).

Until M5, use generated placeholder covers (deterministic gradient from category + title) so the catalog is usable early.

## Out of scope — do not build, even if it seems easy

Login/auth, multi-user, workspace, roles, sharing, comments, version history, import, marketplace, prompt execution, AI chat, AI assistant features, semantic search, artifact/result storage, Google Drive integration, browser extension, cross-device sync.

## Env vars

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=   # server only, never exposed to client
BASIC_AUTH_USER=             # deployment only
BASIC_AUTH_PASSWORD=         # deployment only
```

## Conventions

- TypeScript strict; avoid `any`.
- Shared Zod schemas are the single source of validation truth (client and server).
- Small, focused components; colocate by feature under `app/` and `components/`.
- Conventional commits (`feat:`, `fix:`, `chore:` ...), one logical change per commit.
- When a requirement is ambiguous, check `docs/PRD.md` first; if still ambiguous, ask the owner instead of guessing.
