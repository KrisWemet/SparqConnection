# Backend Requirements (Canonical + v0.3)

## Platform
- Supabase Postgres + Auth; RLS everywhere; Edge Functions for AI.
- Journals: **client-side E2EE** (ciphertext only stored).

## Key Tables (overview)
- `profiles` (user_id PK, onboarding data, love languages, attachment)
- `pairs` (pair_id PK, user_a, user_b, status)
- `identities` (id, user_id, label, is_custom[premium], visible_today)
- `quest_days` (id, quest_id, day, version, base_content JSONB, tags[])
- `daily_plans` (id, user_id, date, version, source: 'ai'|'fallback', content JSONB, model_meta JSONB)
- `notes` (id, user_id, item_type, item_id, body, created_at) — Partner Notes threads
- `saves` (id, user_id, item_type, item_id) — bookmarks
- `plans` (id, user_id, title, when_at, context, created_by)
- `play_sessions` (id, pair_id, deck, state JSONB, turn_by)
- `subscriptions` (user_id, tier, status, renews_at)
- `event_log` (id, user_id, name, props JSONB, ts)

## RLS (high-level)
- `profiles`: user can read/update self.
- `pairs`: member of pair can read pair row.
- `daily_plans`: user reads own; insert/update by server fn constrained to user_id.
- `notes/saves/plans`: owner-only; partner can read if `item_type` scoped share is allowed.
- `play_sessions`: pair members only.
- `subscriptions`: owner-only.

## API Routes (App Router)
- `GET /api/daily/today` → fetch or build daily plan (uses Edge `ai_personalizer`).
- `POST /api/identity/select` → choose identity; custom names premium gate.
- `POST /api/notes` → add Partner Note under item.
- `POST /api/plans` + `GET /api/plans/upcoming`
- `POST /api/play/session` (start), `PATCH /api/play/session` (answer)
- `GET /api/saves` + `POST /api/save`

## Edge Functions
- `ai_personalizer`: input (`profile`, `quest`, `version`, `date`); output matches `DailyPlanSchema`. Uses OpenRouter model ladder; enforces tone + token caps; logs `model_meta`.
- `prebuild_daily_plans` (cron-ready): optional batch precompute for spike hours.

## Notifications
- OneSignal label-only pushes; server `/server/push.ts` helper tags by pair/user.
- Caps and snooze respected at server level.

## Rate Limits
- `/daily/today`: 6/day per user; `/play/session`: 20/day per pair.
- Notes: 60/hour per user (anti-spam).

## Errors
- AI failure → serve canonical `quest_days.base_content` with `source='fallback'`.
- Missing pair on partner features → `409 needs_pair`.

## v0.3 Addenda
- Fixed deprecations: use `@supabase/ssr` in API routes.
- Added `model_meta` and `version` fields for traceability.