-- Featured prompt, atomically (FR-14).
--
-- Only one prompt may be featured at a time. Doing that as two separate
-- statements from the app would leave a window where zero or two rows are
-- featured, and the partial unique index would reject the second write. A
-- function runs inside a single transaction, so the swap is indivisible.
--
-- The index one_featured_prompt stays as the last line of defence.

create or replace function public.set_featured_prompt(target uuid)
returns public.prompts
language plpgsql
as $$
declare
  target_status text;
  result public.prompts;
begin
  -- Lock the row first so concurrent calls serialise rather than race.
  select status into target_status
  from public.prompts
  where id = target
  for update;

  if not found then
    raise exception 'prompt not found'
      using errcode = 'P0002';
  end if;

  -- An archived prompt can never be featured (FR-14).
  if target_status = 'archived' then
    raise exception 'archived prompt cannot be featured'
      using errcode = '23514';
  end if;

  update public.prompts
  set is_featured = false
  where is_featured = true
    and id <> target;

  update public.prompts
  set is_featured = true
  where id = target
  returning * into result;

  return result;
end;
$$;
