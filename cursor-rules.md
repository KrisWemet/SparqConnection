# Cursor Rules — Sparq Connection

* TS + React 18 + Next.js App Router; Tailwind + shadcn/ui.
* Supabase with RLS; never bypass RLS. Use `@supabase/ssr` and `createServerClient` in API routes; `createBrowserClient` on the client.
* Today flow order is fixed (Identity → Center‑Me → DQ → Micro‑Action → Journal → Appreciation → Reflection).
* Journals: encrypted by default. Don't log content. Don't store keys server‑side.
* Use OpenRouter models; keep temp ≤ 0.3 for Personalizer. Validate LLM JSON with Zod.
* Push: OneSignal label‑only, caps + snooze.
* Respect Free vs Premium gates.