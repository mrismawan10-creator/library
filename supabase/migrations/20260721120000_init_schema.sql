-- Prompt Library Dashboard — initial schema (PRD §7).
--
-- Security posture (PRD §10, CLAUDE.md security rule 2): RLS is enabled on every
-- table with ZERO policies. That is deny-all for the anon and authenticated
-- roles. All access goes through server code using the service-role key, which
-- bypasses RLS. Do not add policies unless the auth model itself changes.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- categories (PRD §7.2)
-- ---------------------------------------------------------------------------

create table if not exists public.categories (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null unique,
  slug                text not null unique,
  description         text,
  template_cover_path text,
  sort_order          integer not null default 0,
  show_on_home        boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists categories_sort_order_idx
  on public.categories (sort_order, name);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- prompts (PRD §7.1)
-- ---------------------------------------------------------------------------

create table if not exists public.prompts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,          -- max 120 chars, enforced in the app (Zod)
  prompt_text  text not null,
  description  text,
  category_id  uuid references public.categories (id) on delete set null,
  output_type  text not null,          -- open list, validated in the app (Zod)
  ai_model     text,
  cover_path   text,
  cover_source text,                   -- upload | category_template | system_default | ai_generated (reserved)
  is_favorite  boolean not null default false,
  is_featured  boolean not null default false,
  status       text not null default 'active',
  usage_count  integer not null default 0,
  last_used_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint prompts_status_check check (status in ('active', 'archived')),
  constraint prompts_cover_source_check check (
    cover_source is null
    or cover_source in ('upload', 'category_template', 'system_default', 'ai_generated')
  ),
  constraint prompts_usage_count_check check (usage_count >= 0),
  -- FR-14: an archived prompt can never be the featured one.
  constraint prompts_featured_not_archived_check check (
    not (is_featured and status = 'archived')
  )
);

-- FR-14: at most one featured prompt at a time.
create unique index if not exists one_featured_prompt
  on public.prompts (is_featured) where is_featured = true;

-- Search (FR-11): ILIKE + pg_trgm. No FTS config — content is mixed ID/EN.
create index if not exists prompts_title_trgm
  on public.prompts using gin (title gin_trgm_ops);
create index if not exists prompts_text_trgm
  on public.prompts using gin (prompt_text gin_trgm_ops);
create index if not exists prompts_desc_trgm
  on public.prompts using gin (description gin_trgm_ops);

-- Catalog row queries (FR-01): archived is excluded everywhere, so status leads.
create index if not exists prompts_recently_added_idx
  on public.prompts (status, created_at desc);
create index if not exists prompts_recently_used_idx
  on public.prompts (status, last_used_at desc nulls last);
create index if not exists prompts_favorites_idx
  on public.prompts (status, is_favorite) where is_favorite = true;
create index if not exists prompts_category_idx
  on public.prompts (category_id, status);

create trigger prompts_set_updated_at
  before update on public.prompts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tags (PRD §7.3)
-- ---------------------------------------------------------------------------

create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

-- FR-10: case-insensitive uniqueness enforced by the database.
create unique index if not exists tags_name_ci
  on public.tags (lower(name));

-- ---------------------------------------------------------------------------
-- prompt_tags (PRD §7.4)
-- ---------------------------------------------------------------------------

create table if not exists public.prompt_tags (
  prompt_id uuid not null references public.prompts (id) on delete cascade,
  tag_id    uuid not null references public.tags (id) on delete cascade,
  primary key (prompt_id, tag_id)
);

create index if not exists prompt_tags_tag_idx
  on public.prompt_tags (tag_id);

-- ---------------------------------------------------------------------------
-- app_settings (PRD §7.5) — singleton, read-or-create
-- ---------------------------------------------------------------------------

create table if not exists public.app_settings (
  id                       uuid primary key default gen_random_uuid(),
  prompt_variables_enabled boolean not null default false,
  ai_features_enabled      boolean not null default false,
  ai_provider              text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  -- Guarantees "exactly one row" at the database level rather than by convention.
  singleton                boolean not null default true,
  constraint app_settings_singleton_check check (singleton)
);

create unique index if not exists app_settings_singleton
  on public.app_settings (singleton);

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: enabled everywhere, zero policies (deny-all).
-- ---------------------------------------------------------------------------

alter table public.categories   enable row level security;
alter table public.prompts      enable row level security;
alter table public.tags         enable row level security;
alter table public.prompt_tags  enable row level security;
alter table public.app_settings enable row level security;
