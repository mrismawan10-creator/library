-- Private storage bucket for prompt covers (PRD §8).
--
-- No storage policies are created, matching the deny-all posture on the tables:
-- the service-role client bypasses RLS, and nothing else may read or write.
-- Files reach the browser only through short-lived signed URLs generated on the
-- server.
--
-- Layout inside the bucket:
--   prompts/{prompt_id}/original.{ext}
--   prompts/{prompt_id}/poster.webp      -- 2:3
--   prompts/{prompt_id}/thumbnail.webp   -- catalog and home
--
-- If this statement fails on your Supabase project (permissions on
-- storage.buckets vary by plan and CLI version), create the bucket manually
-- instead: Storage → New bucket → name "prompt-covers" → Public bucket OFF.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prompt-covers',
  'prompt-covers',
  false,
  10485760, -- 10 MB (PRD §21.5); the server also validates magic bytes
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;
