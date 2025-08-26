# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` Next.js App Router pages, layouts, and API routes (e.g., `src/app/api/*`).
- `src/components/` Reusable UI and feature components (Today flow, Partner, Providers, UI).
- `src/lib/` Core libraries: personalization engine, CQ variants loader, i18n, Supabase clients, schemas.
- `supabase/` Database migrations, SQL functions, and edge functions.
- `docs/personalization/` Pasteable JSON specs for content, rules, and UI strings.
- `tests/` Vitest test files (table‑driven unit tests).

## Build, Test, and Development Commands
- `pnpm dev` Start Next.js locally (Turbopack).
- `pnpm build` Validate personalization JSON then build the app.
- `pnpm validate:personalization` Validate JSON specs in `docs/personalization`.
- `pnpm test` Run unit tests with Vitest.
- Supabase (local): `supabase start`, `supabase db push` (apply migrations). Be cautious with `supabase db reset` (destructive).

## Coding Style & Naming Conventions
- Language: TypeScript + React (functional components, hooks).
- Indentation: 2 spaces; avoid one‑letter variable names.
- Filenames: kebab‑case for components and libs (e.g., `cq-variants.ts`).
- API routes live under `src/app/api/<feature>/route.ts`.
- Validation: use Zod schemas where applicable (`src/lib/schemas.ts`).
- Lint: `pnpm lint`; Types: `pnpm typecheck`.

## Testing Guidelines
- Framework: Vitest. Place tests in `tests/*.test.ts` (e.g., `tests/cq-variants.test.ts`).
- Write table‑driven cases for selectors, loaders, and mappers.
- Run locally with `pnpm test`; keep tests deterministic (no network calls).

## Commit & Pull Request Guidelines
- Commits: imperative present tense (e.g., "Add CQ selector", "Fix onboarding gate"). Scope changes narrowly.
- PRs: include a clear summary, rationale, screenshots for UI changes, and link related issues. Note any DB migrations and rollout steps.

## Security & Configuration Tips
- Secrets: configure `.env.local` (e.g., `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, PostHog keys). Do not commit secrets.
- Local dev: set `NEXT_PUBLIC_BYPASS_ONBOARDING=1` to skip onboarding gating.
- Consent: never expose partner labels unless both parties opted in (`share_with_partner.show_labels`).

## Architecture Overview (High‑Level)
- Personalization: `src/lib/personalization-engine.ts` computes copy flags from quiz outputs and rules.
- CQ Content: `src/lib/cq-variants.ts` selects variants from `docs/personalization/cq_variants_v1.json`; served by `/api/content/cq-step`.
- i18n: `src/lib/i18n.ts` loads `ui_strings.en-US.json`; use `t(key)` for microcopy.
