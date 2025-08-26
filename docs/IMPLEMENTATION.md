# IMPLEMENTATION (Step-by-step)

## 0) Prereqs
- Next.js App Router + TS, Tailwind + shadcn/ui.
- Supabase CLI installed; project linked.
- OneSignal, Stripe, PostHog, Sentry env keys; OpenRouter key.

## 1) Env
Create `.env.local` from `.env.example`. Fill:
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server only)
- ONE_SIGNAL_APP_ID, POSTHOG_API_KEY, STRIPE_*, OPENROUTER_API_KEY

## 2) Database
- Copy `supabase/migrations/000_init.sql` … `003_research_integration.sql`.
- Run `supabase db push`.
- Seed content with `npm run seed`.

## 3) Auth & Supabase (new package)
Use `@supabase/ssr` (replaces deprecated helpers).

**`lib/supabaseClient.ts` (browser)**
```ts
import { createBrowserClient } from '@supabase/ssr'
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**API route pattern (server)**
```ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export function serverClient() {
  return createServerClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookies
  })
}
```

## 4) Schemas & Contracts
- `lib/schemas.ts` includes `DailyPlanSchema` (Zod) for LLM outputs.
- Tests validate sample JSON (see `tests/schemas.test.ts`).

## 5) Edge Functions
`supabase/functions/ai_personalizer/index.ts`:
- Calls OpenRouter with model ladder.
- Enforces temp ≤ 0.3, max_tokens ≤ 320.
- Validates JSON; on fail returns canonical fallback.

Deploy: `supabase functions deploy ai_personalizer prebuild_daily_plans`

## 6) Today API
`GET /api/daily/today`:
- Read existing `daily_plans` for (user_id, date).
- If missing/stale → call edge `ai_personalizer`.
- Save result with model_meta, version, source.
- Return shape expected by UI cards.

## 7) UI
- `app/(app)/today/page.tsx` renders cards in canonical order.
- `components/today/*` cards receive props from `/api/daily/today`.
- `components/common/SaveForLaterButton.tsx`, `PlannerMini.tsx`.

## 8) Notifications
- `server/push.ts` (OneSignal label-only).
- Respect caps; never include partner content in payloads.

## 9) Analytics & Errors
- `lib/analytics.ts` (PostHog).
- Sentry init in `app/layout.tsx` and error boundary.

## 10) CI & Evals
- Add `npm run evals` to run `scripts/prompt-evals.ts`.
- Gate merges on: lint, typecheck, tests, prompt evals.

## 11) Security Notes
- Journals: E2EE; never store keys server-side.
- RLS for all tables; verify with tests.
- Soft delete: 30-day grace → purge job.

## 12) Roadmap Hooks
- Web Push native fallback (post-MVP).
- Workshops/coaching drops (Ultimate tier).
- Audio notes and localization later.


---

## Cursor rule fix
You referenced `createRouteHandlerClient` (deprecated with the old helpers). Replace that line in **`cursor-rules.md`** with:

> "Use `@supabase/ssr` and `createServerClient` in API routes; `createBrowserClient` on the client."

---

## Suggested `package.json` scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "test": "vitest run",
    "db:push": "supabase db push",
    "fx:deploy": "supabase functions deploy ai_personalizer prebuild_daily_plans",
    "seed": "tsx scripts/seed-content.ts",
    "evals": "tsx scripts/prompt-evals.ts"
  }
}
```