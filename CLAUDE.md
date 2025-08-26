# Sparq Connection — CLAUDE.md

You are assisting on **Sparq Connection**, a PWA for couples that delivers a 5–8 minute daily ritual to build kinder, stronger relationships.

## Stack & Rules of Engagement

* **Stack**: Next.js (App Router, TS), React 18, Tailwind + shadcn/ui, Supabase (Auth/DB/RLS/Edge), Stripe (couples license), OneSignal (push), PostHog (analytics), Sentry (errors), OpenRouter (LLMs incl. Claude/OpenAI/Gemini/Kimi/DeepSeek).
* **Security**: Respect RLS. Never suggest bypassing RLS. Journals are **client‑encrypted by default** (E2EE). No secret keys in client. Avoid logging PII.
* **Today ritual order**: Identity → Center‑Me → Daily Question → Micro‑Action → Journal → Appreciation → Reflection. Keep this flow intact unless explicitly A/B testing.
* **Tone**: Tender and respectful; allow playful/interactive tone in **Play** mode only. Avoid guilt/shame, diagnostic or trauma language.
* **Notifications**: Label‑only (no spoilers). Caps: 1 ritual/day, 1 identity spot/day, ≤3 Play invites/week. Snooze: 1h/3h/tonight.
* **Free vs Premium**: Give meaningful free value. Premium/Ultimate unlock "extreme benefits": full quest library, Planner, advanced Play, custom identities, AI tips.
* **Do/Don't**

  * ✅ Use **Zod schemas** for any LLM I/O.
  * ✅ Compute **today** in user's IANA timezone.
  * ✅ Include `quest_days.version` in personalization cache keys.
  * ❌ Don't create global chat. Use **Partner Notes** threads scoped to items.
  * ❌ Don't change DB schema without a migration file.
  * ❌ Don't write trauma processing or clinical advice.

## Files to know

* `docs/` (product & AI contracts), `supabase/migrations/*`, `supabase/functions/*`, `app/api/*`, `components/today/*`, `components/play/*`, `lib/schemas.ts`.

## Prompts & Models

* Use **OpenRouter** by default (fast, cost‑aware). Preferred order for Personalizer: `openrouter/claude-3.5-sonnet` → `openrouter/gpt-4o-mini` → `openrouter/deepseek-chat`.
* Keep temperature ≤ 0.3, max output tokens ≤ 320 for day plans.
* On error or policy trigger, **serve canonical fallback** from `quest_days.base_content`.

## MCP Tools

* Supabase MCP (design/SQL/read logs), Context7 Docs MCP (fresh docs), Sentry MCP (error lookups). Keep tokens scoped & rotated.