# Prompt Evals (Schema • Tone • Tokens)

## What this does

* Runs N sample profiles through **Personalizer** prompts via OpenRouter.
* Validates JSON against `DailyPlanSchema`.
* Checks tone fences (no guilt/diagnosis/trauma words).
* Checks token counts within budget.

## How to run

* Configure `OPENROUTER_API_KEY`.
* Run: `npm run evals` (script references `scripts/prompt-evals.ts`).

## Pass criteria

* 100% valid JSON; 0 policy violations; avg latency < 2s; avg tokens < 350 out.