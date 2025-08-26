# AI Guardrails

* Forbidden: trauma processing, abuse inventories, diagnoses, treatment advice.
* Style fences: no shame/guilt, no absolute language, label‑only pushes.
* JSON only outputs where specified; never free‑text spill.
* Always include content `version` in cache key; serve canonical fallback on error.