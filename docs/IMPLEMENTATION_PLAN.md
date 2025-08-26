# Implementation Plan

## Near‑Term (This Sprint)
1) If–Then Recall in Reflection
- Show the user’s saved If–Then plan on the Reflection card with quick thumbs (Helped / Not today).
- Event: `if_then_helpful` (yes/no). No shaming; optional.

2) Bottom Nav in (app) Layout
- Add `src/app/(app)/layout.tsx` (done) and remove per‑page duplications.
- Ensure safe overlap with content (extra bottom padding).

3) Warm Palette + Shared Button
- Add CSS variables in `globals.css` (ivory, coral, sage, indigo, border).
- Create `components/ui/button.tsx` with consistent radius, focus rings, disabled state.
- Migrate primary CTAs (Home hero, key modals) incrementally.

## Next Sprint
4) Collapse Completed Cards
- When a step completes, collapse to a one‑line summary + Edit link.
- Persist collapsed state for the session.

5) Progress Persistence & Events
- Persist per‑day step completion to localStorage + POST `event_log` for server analytics.
- Reflect real counts in `/home` ring and Today stepper.

6) Coach Marks Spotlight + Focus Trap
- Replace tooltip‑style coach marks with spotlight mask and a11y focus trap.
- Only show once per surface; rely on `tour_completed_at`.

7) Settings Page
- Edit `time_preference`, `tone_preference`, `appreciation_channel`; toggle reminders.

## Best Practices
- Accessibility: AA contrast, visible focus, 44×44 hit area, reduced‑motion support.
- Autonomy: Opt‑in reminders, easy dismissals, no shaming language.
- Plain language: Short titles, friendly tone, zero jargon.
- Metrics: completion funnel, relevance thumbs, confusion (help opens), return rate.

## Risks & Mitigations
- Overwhelm: keep each screen airy; limit choices; progressive disclosure.
- Confusion: help hints are short and collapsible; track `help_opened_*`.
- Privacy: “Encrypted by default” journal; avoid exposing content without explicit consent.
