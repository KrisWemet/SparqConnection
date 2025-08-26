# AI Models & Routing (OpenRouter + Fallbacks)

**Providers**: OpenRouter (routes to Claude, OpenAI, Gemini, DeepSeek, Kimi, etc.).

## Use‑case matrix

* **Personalizer (daily plans)**: 1) `anthropic/claude-3.5-sonnet` via OpenRouter; 2) `openai/gpt-4o-mini`; 3) `deepseek/deepseek-chat`. Temp 0.3, max\_tokens 320.
* **Tip Coach (short phrasing)**: lightweight: 1) `gpt-4o-mini`; 2) `gemini-1.5-flash`; 3) `deepseek-chat`. Temp 0.2, max\_tokens 120.
* **Draft content ops**: longform safe: `claude-3.5-sonnet`.

## Budget & Safety

* Record `model_meta` (provider, model, latency\_ms, status). Circuit‑break by daily token/cost caps. On fail → canonical fallback.