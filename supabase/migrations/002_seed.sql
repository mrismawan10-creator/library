-- Seed data: the six initial categories (PRD §21.6) and the app_settings
-- singleton (PRD §7.5). Idempotent — safe to re-run.
--
-- These categories are a starting point, not a fixed list: the owner can rename,
-- reorder, add, or delete them from the app.

insert into public.categories (name, slug, description, sort_order, show_on_home)
values
  ('Image Generation',            'image-generation',            'Prompts for generating still images.',                  1, true),
  ('Video',                       'video',                       'Prompts for video generation and editing.',             2, true),
  ('Writing & Reports',           'writing-reports',             'Long-form writing, drafting, and reporting prompts.',   3, true),
  ('Infographics & Presentations','infographics-presentations',  'Prompts for slides, decks, and visual explainers.',      4, true),
  ('Coding & Automation',         'coding-automation',           'Prompts for code, scripts, and workflow automation.',    5, true),
  ('Research',                    'research',                    'Research, analysis, and synthesis prompts.',             6, true)
on conflict (slug) do nothing;

-- Singleton settings row. Both feature flags stay false in the MVP
-- (CLAUDE.md product invariant 13).
insert into public.app_settings (prompt_variables_enabled, ai_features_enabled)
select false, false
where not exists (select 1 from public.app_settings);
