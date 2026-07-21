# Prompt Library Dashboard

A personal, single-user web app for storing AI prompts as a visual, streaming-catalog-style library: poster covers, category rows, search and filter, full-text copy in one click, and editing with autosave. The app is AI-agnostic and never executes prompts.

## Stack

Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui · Supabase (PostgreSQL + Storage, server-only access) · Zod.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Environment

See `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never reach the client bundle. `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` are used only when deploying — public deployment without protection is forbidden.

## Documentation

- `docs/PRD.md` — product source of truth (requirements, schema, endpoints, milestones).
- `CLAUDE.md` — operating rules for AI coding agents working in this repo.
