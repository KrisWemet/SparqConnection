import fs from 'fs'
import path from 'path'

export type AttachmentPrimary = 'secure' | 'anxious' | 'avoidant' | 'mixed'
export type LoveLanguage = 'words' | 'acts' | 'time' | 'touch' | 'gifts'

export type AttachmentResult = {
  distribution: Record<AttachmentPrimary, number> // 0..1 or 0..100 accepted
  primary: AttachmentPrimary
  confidence: number // 0..1
}

export type LoveLanguageResult = {
  ranked_list: LoveLanguage[]
  top_two: LoveLanguage[]
  confidence: number // 0..1
}

export type CopyFlags = {
  benefits_reassurance?: { value: boolean; strength?: number }
  prefers_space?: { value: boolean; strength?: number }
  prefers_structure?: { value: boolean; strength?: number }
  words_affirming?: { value: boolean; strength?: number }
  time_affirming?: { value: boolean; strength?: number }
  touch_affirming?: { value: boolean; strength?: number }
}

type Rule = {
  flag: keyof CopyFlags
  if: any
  set: { value: boolean; strength?: any }
}

type RulesDoc = {
  version: string
  inputs: any
  rules: Rule[]
  functions?: Record<string, string>
  fallback?: {
    when: any
    set: Record<string, { value: boolean; strength?: number }>
  }
}

function readJsonIfExists<T = any>(p: string): T | null {
  try {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8')
      return JSON.parse(raw)
    }
  } catch {}
  return null
}

function normalizeDistribution(dist: Record<string, number>): Record<string, number> {
  // Accept 0..100 or 0..1; normalize to 0..1
  const vals = Object.values(dist)
  const maxVal = Math.max(...vals, 1)
  const sum = vals.reduce((a, b) => a + b, 0)
  const looksPct = maxVal > 1.01 || sum > 1.01
  const denom = looksPct ? 100 : 1
  const normalized: Record<string, number> = {}
  for (const k of Object.keys(dist)) normalized[k] = (dist as any)[k] / denom
  return normalized
}

function entropy(distribution: Record<string, number>): number {
  const d = normalizeDistribution(distribution)
  let e = 0
  for (const v of Object.values(d)) {
    if (v > 0) e += -v * Math.log2(v)
  }
  return e
}

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
  if (cond.entropy_gt) { const [p, v] = cond.entropy_gt; return entropy(get(ctx, p)) > v }
  return false
}

function evalStrength(expr: any, ctx: any): number | undefined {
  if (expr == null) return undefined
  if (typeof expr === 'number') return expr
  if (expr.scale) {
    const [p, min, max] = expr.scale
    const x = get(ctx, p)
    if (typeof x !== 'number') return undefined
    const s = (x - min) / Math.max(max - min, 1e-9)
    return Math.max(0, Math.min(1, s))
  }
  if (expr.avg) {
    const parts = expr.avg.map((e: any) => evalStrength(e, ctx)).filter((n: any) => typeof n === 'number')
    if (parts.length === 0) return undefined
    return parts.reduce((a: number, b: number) => a + b, 0) / parts.length
  }
  return undefined
}

export function computeCopyFlags(
  attachment: AttachmentResult | null,
  love: LoveLanguageResult | null,
  rulesPath: string = path.join(process.cwd(), 'docs/personalization/copy_flags_rules.json')
): CopyFlags {
  const defaultFlags: CopyFlags = {}
  const rulesDoc = readJsonIfExists<RulesDoc>(rulesPath)
  const ctx = {
    attachment: attachment ? {
      distribution: attachment.distribution ? normalizeDistribution(attachment.distribution as any) : { secure: 0, anxious: 0, avoidant: 0, mixed: 0 },
      primary: attachment.primary,
      confidence: attachment.confidence ?? 0
    } : { distribution: { secure: 0, anxious: 0, avoidant: 0, mixed: 0 }, primary: 'secure', confidence: 0 },
    love_languages: love || { ranked_list: [], top_two: [], confidence: 0 }
  }

  if (!rulesDoc) {
    // Simple fallback mapping
    const avoid = ctx.attachment.primary === 'avoidant' || ctx.attachment.distribution.avoidant >= 0.35
    const anx = ctx.attachment.primary === 'anxious' || ctx.attachment.distribution.anxious >= 0.35
    const top = (love?.top_two?.[0] || love?.ranked_list?.[0]) as LoveLanguage | undefined
    return {
      prefers_space: { value: !!avoid, strength: avoid ? 0.6 : 0 },
      benefits_reassurance: { value: !!anx, strength: anx ? 0.6 : 0 },
      prefers_structure: { value: avoid || (ctx.attachment.distribution.mixed >= 0.3), strength: 0.5 },
      words_affirming: { value: top === 'words', strength: top === 'words' ? 0.7 : 0 },
      time_affirming: { value: top === 'time', strength: top === 'time' ? 0.7 : 0 },
      touch_affirming: { value: top === 'touch', strength: top === 'touch' ? 0.7 : 0 },
    }
  }

  const out: CopyFlags = { ...defaultFlags }

  // Fallback clause first
  if (rulesDoc.fallback && evalCond(rulesDoc.fallback.when, ctx)) {
    for (const [flag, spec] of Object.entries(rulesDoc.fallback.set)) {
      ;(out as any)[flag] = { value: spec.value, strength: spec.strength }
    }
  }

  // Rules
  for (const rule of rulesDoc.rules) {
    if (!rule || !rule.flag) continue
    const ok = evalCond(rule.if, ctx)
    if (!ok) continue
    const strength = evalStrength(rule.set.strength, ctx)
    ;(out as any)[rule.flag] = { value: rule.set.value, strength }
  }

  return out
}

