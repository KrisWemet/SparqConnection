-- 012_backfill_plain_language.sql
-- Backfill existing daily_plans.content to plain-language

-- Helper: apply_plain_language(text) → text
CREATE OR REPLACE FUNCTION apply_plain_language(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              t,
              '(?i)\bbids\b',
              'connection cues',
              'g'
            ),
            '(?i)\bturn toward\b',
            'respond warmly',
            'g'
          ),
          '(?i)\brepair attempt\b',
          'quick fix',
          'g'
        ),
        '(?i)\battachment\b',
        'how you handle closeness',
        'g'
      ),
      '(?i)\bboundaries\b',
      'what feels okay / not okay',
      'g'
    )
$$;

-- Update rows by mapping individual string fields and templates array
UPDATE daily_plans
SET content =
  content
  || jsonb_build_object('story', to_jsonb(apply_plain_language(content->>'story')))
  || jsonb_build_object('dq', to_jsonb(apply_plain_language(content->>'dq')))
  || jsonb_build_object('micro_action', to_jsonb(apply_plain_language(content->>'micro_action')))
  || jsonb_build_object('journal', to_jsonb(apply_plain_language(content->>'journal')))
  || jsonb_build_object('reflection', to_jsonb(apply_plain_language(content->>'reflection')))
  || jsonb_build_object(
       'appreciation_templates',
       COALESCE(
         (
           SELECT jsonb_agg(to_jsonb(apply_plain_language(v)))
           FROM jsonb_array_elements_text(content->'appreciation_templates') AS e(v)
         ),
         '[]'::jsonb
       )
     );

