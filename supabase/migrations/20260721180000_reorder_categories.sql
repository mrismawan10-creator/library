-- Atomic category reordering (FR-09).
--
-- The app previously wrote sort_order one row at a time in a loop, which could
-- leave the order half-applied if a write failed midway. A function applies the
-- whole new order inside one transaction, using WITH ORDINALITY so each id's
-- position in the array becomes its sort_order.

create or replace function public.reorder_categories(ids uuid[])
returns void
language sql
as $$
  update public.categories c
  set sort_order = ordered.position
  from (
    select id, ordinality as position
    from unnest(ids) with ordinality as t(id, ordinality)
  ) as ordered
  where c.id = ordered.id;
$$;
