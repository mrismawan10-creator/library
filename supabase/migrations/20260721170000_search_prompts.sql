-- Search, filter, and sort in one function (FR-11, FR-12).
--
-- Why a function instead of PostgREST query params: search has to reach tags
-- and category names, which live in other tables, and PostgREST cannot OR
-- across an embedded resource. Doing it as several round trips and merging in
-- JavaScript would break sorting and paging.
--
-- Two things fall out of that:
--
--   * The excerpt is cut here with left(prompt_text, 240), so full prompt text
--     never leaves the database for a list query (PRD §14).
--   * Every list surface — all prompts, favorites, archived, category pages,
--     search results — goes through one code path with one set of rules.
--
-- Matching is ILIKE + pg_trgm, deliberately not a full-text search config: the
-- library mixes Indonesian and English, and the English stemmer mangles
-- Indonesian words.

create extension if not exists pg_trgm;

-- Search also reads these two by name.
create index if not exists tags_name_trgm
  on public.tags using gin (name gin_trgm_ops);
create index if not exists categories_name_trgm
  on public.categories using gin (name gin_trgm_ops);

-- Parameters are prefixed so they cannot be mistaken for columns of the same
-- name inside the query.
create or replace function public.search_prompts(
  p_q             text        default null,
  p_category_id   uuid        default null,
  p_tag_ids       uuid[]      default null,
  p_output_types  text[]      default null,
  p_ai_model      text        default null,
  p_favorite      boolean     default null,
  p_featured      boolean     default null,
  p_status        text        default 'active',
  p_sort          text        default 'newest',
  p_limit         integer     default 100,
  p_offset        integer     default 0
)
returns table (
  id            uuid,
  title         text,
  excerpt       text,
  category_id   uuid,
  output_type   text,
  ai_model      text,
  cover_path    text,
  cover_source  text,
  is_favorite   boolean,
  is_featured   boolean,
  status        text,
  usage_count   integer,
  last_used_at  timestamptz,
  created_at    timestamptz,
  updated_at    timestamptz,
  category_name text,
  category_slug text
)
language sql
stable
as $$
  with needle as (
    -- Wildcards are escaped so a literal % or _ in the query stays literal.
    select case
      when p_q is null or btrim(p_q) = '' then null
      else '%' || replace(replace(replace(btrim(p_q), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    end as pattern
  )
  select
    pr.id,
    pr.title,
    left(pr.prompt_text, 240) as excerpt,
    pr.category_id,
    pr.output_type,
    pr.ai_model,
    pr.cover_path,
    pr.cover_source,
    pr.is_favorite,
    pr.is_featured,
    pr.status,
    pr.usage_count,
    pr.last_used_at,
    pr.created_at,
    pr.updated_at,
    c.name as category_name,
    c.slug as category_slug
  from public.prompts pr
  left join public.categories c on c.id = pr.category_id
  cross join needle n
  where
    -- 'all' is the only way to see archived alongside active (FR-11).
    (p_status = 'all' or pr.status = p_status)
    and (p_category_id is null or pr.category_id = p_category_id)
    and (p_output_types is null or pr.output_type = any(p_output_types))
    and (p_ai_model is null or pr.ai_model = p_ai_model)
    and (p_favorite is null or pr.is_favorite = p_favorite)
    and (p_featured is null or pr.is_featured = p_featured)
    -- Multiple tags narrow: a prompt must carry all of them.
    and (
      p_tag_ids is null
      or (
        select count(distinct pt.tag_id)
        from public.prompt_tags pt
        where pt.prompt_id = pr.id
          and pt.tag_id = any(p_tag_ids)
      ) = array_length(p_tag_ids, 1)
    )
    and (
      n.pattern is null
      or pr.title ilike n.pattern escape '\'
      or pr.prompt_text ilike n.pattern escape '\'
      or coalesce(pr.description, '') ilike n.pattern escape '\'
      or pr.output_type ilike n.pattern escape '\'
      or coalesce(pr.ai_model, '') ilike n.pattern escape '\'
      or coalesce(c.name, '') ilike n.pattern escape '\'
      or exists (
        select 1
        from public.prompt_tags pt
        join public.tags t on t.id = pt.tag_id
        where pt.prompt_id = pr.id
          and t.name ilike n.pattern escape '\'
      )
    )
  order by
    -- Only the branch matching p_sort produces a value; the rest are NULL for
    -- every row, so they tie and contribute nothing.
    case when p_sort = 'favorites_first' and pr.is_favorite then 0 else 1 end,
    case when p_sort = 'alphabetical' then lower(pr.title) end asc,
    case when p_sort = 'oldest' then pr.created_at end asc,
    case when p_sort = 'most_used' then pr.usage_count end desc,
    case when p_sort = 'recently_used' then pr.last_used_at end desc nulls last,
    case when p_sort = 'recently_updated' then pr.updated_at end desc,
    pr.created_at desc
  limit greatest(p_limit, 0)
  offset greatest(p_offset, 0);
$$;
