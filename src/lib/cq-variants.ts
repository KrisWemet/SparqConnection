import fs from 'fs'
import path from 'path'

type VariantItem = {
  copy_variant_id: string
  conditions?: any
  pairing_overlays?: Record<string, { text: string }>
  text: string
}

export type CQStep = {
  step_id: string
  base: { text: string; copy_variant_id: string }
  variants?: VariantItem[]
  fallback?: { copy_variant_id: string }
}

export type CQVariantsDoc = {
  version: string
  steps: CQStep[]
}

let cache: { mtimeMs: number; doc: CQVariantsDoc } | null = null

function loadDocFile(): CQVariantsDoc | null {
  const filePath = path.join(process.cwd(), 'docs/personalization/cq_variants_v1.json')
  try {
    const stat = fs.statSync(filePath)
    if (cache && cache.mtimeMs === stat.mtimeMs) return cache.doc
    const raw = fs.readFileSync(filePath, 'utf-8')
    const doc: CQVariantsDoc = JSON.parse(raw)
    cache = { mtimeMs: stat.mtimeMs, doc }
    return doc
  } catch {
    return null
  }
}

// Minimal DSL evaluator shared shape with personalization-engine
function get(obj: any, pathStr: string): any {
  return pathStr.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj)
}

function evalCond(cond: any, ctx: any): boolean {
  if (!cond || typeof cond !== 'object') return !!cond
  if (cond.all) return cond.all.every((c: any) => evalCond(c, ctx))
  if (cond.any) return cond.any.some((c: any) => evalCond(c, ctx))
  if (cond.gte) { const [p, v] = cond.gte; return get(ctx, p) >= v }
  if (cond.gt)  { const [p, v] = cond.gt;  return get(ctx, p) > v }
  if (cond.lte) { const [p, v] = cond.lte; return get(ctx, p) <= v }
  if (cond.lt)  { const [p, v] = cond.lt;  return get(ctx, p) < v }
  if (cond.eq)  { const [p, v] = cond.eq;  return get(ctx, p) === v }
  if (cond.in)  { const [v, p] = cond.in; const arr = get(ctx, p); return Array.isArray(arr) && arr.includes(v) }
  return false
}

export type SelectionInput = {
  stepId: string
  flags: Record<string, any>
  pairing?: string | null
  entropyLow?: boolean
  locale?: string
}

export function selectPromptVariant(input: SelectionInput): { text: string; copy_variant_id: string; reason: string } | null {
  const doc = loadDocFile()
  if (!doc) return null
  const step = doc.steps.find(s => s.step_id === input.stepId)
  if (!step) return null

  // Entropy low → always serve base or declared fallback
  if (input.entropyLow) {
    const chosenId = step.fallback?.copy_variant_id || step.base.copy_variant_id
    const chosenText = step.variants?.find(v => v.copy_variant_id === chosenId)?.text || step.base.text
    return { text: chosenText, copy_variant_id: chosenId, reason: 'entropy_low' }
  }

  const ctx = { flags: input.flags }
  const matches = (step.variants || []).filter(v => !v.conditions || evalCond(v.conditions, ctx))

  // Deterministic tiebreaker: lexical order by copy_variant_id
  matches.sort((a, b) => a.copy_variant_id.localeCompare(b.copy_variant_id))
  const chosen = matches[0]

  let text: string
  let copyId: string
  let reason: string

  if (chosen) {
    text = chosen.text
    copyId = chosen.copy_variant_id
    reason = 'matched_conditions'
  } else {
    const fallbackId = step.fallback?.copy_variant_id || step.base.copy_variant_id
    text = step.variants?.find(v => v.copy_variant_id === fallbackId)?.text || step.base.text
    copyId = fallbackId
    reason = 'fallback'
  }

  // Apply pairing overlay if provided and allowed by caller
  if (input.pairing && chosen && chosen.pairing_overlays && chosen.pairing_overlays[input.pairing]) {
    text = `${text} ${chosen.pairing_overlays[input.pairing].text}`
  }

  return { text, copy_variant_id: copyId, reason }
}

export function getCQDocVersion(): string | null {
  const doc = loadDocFile()
  return doc?.version || null
}

