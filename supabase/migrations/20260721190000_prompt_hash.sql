-- Prompt content hash for duplicate detection (bulk import, doc §13.2).
--
-- The hash is over a NORMALISED form of prompt_text — trimmed, whitespace runs
-- collapsed to a single space — so trivial spacing differences count as the
-- same prompt. The stored prompt_text is never changed; only this derived hash
-- is normalised. The app computes the identical hash (md5 of the same
-- normalisation) so imported rows match this backfill.

alter table public.prompts
  add column if not exists prompt_hash text;

-- Backfill existing rows with the same normalisation the app uses.
update public.prompts
set prompt_hash = md5(regexp_replace(btrim(prompt_text), '\s+', ' ', 'g'))
where prompt_hash is null;

create index if not exists idx_prompts_prompt_hash
  on public.prompts (prompt_hash);
