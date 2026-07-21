-- Copy tracking (FR-07).
--
-- Copying is not editing. The detail page shows "Updated" and "Last used" as
-- separate facts, so a copy must move usage_count and last_used_at while
-- leaving updated_at alone.
--
-- Enforcing that in the trigger rather than in the app means it holds for every
-- writer, including a manual fix in the SQL editor.

create or replace function public.prompts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  -- If usage columns are the only difference, this was a copy, not an edit.
  if to_jsonb(new) - 'usage_count' - 'last_used_at' - 'updated_at'
     = to_jsonb(old) - 'usage_count' - 'last_used_at' - 'updated_at' then
    new.updated_at = old.updated_at;
    return new;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists prompts_set_updated_at on public.prompts;

create trigger prompts_set_updated_at
  before update on public.prompts
  for each row execute function public.prompts_set_updated_at();

-- Incrementing in SQL rather than read-modify-write in the app, so two copies
-- in quick succession cannot lose a count.
create or replace function public.record_copy_event(target uuid)
returns boolean
language plpgsql
as $$
declare
  affected integer;
begin
  update public.prompts
  set usage_count = usage_count + 1,
      last_used_at = now()
  where id = target;

  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;
