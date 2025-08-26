#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

function readJson(file) {
  const p = path.join(process.cwd(), file)
  if (!fs.existsSync(p)) return null
  const raw = fs.readFileSync(p, 'utf-8')
  try { return JSON.parse(raw) } catch (e) { throw new Error(`${file}: invalid JSON (${e.message})`) }
}

function fail(msg) { console.error(`✖ ${msg}`); process.exitCode = 1 }
function ok(msg) { console.log(`✔ ${msg}`) }

// Validate copy_flags_rules.json (lightweight)
try {
  const doc = readJson('docs/personalization/copy_flags_rules.json')
  if (doc) {
    if (typeof doc.version !== 'string') fail('copy_flags_rules.json: missing version')
    if (!Array.isArray(doc.rules)) fail('copy_flags_rules.json: rules must be array')
    if (doc.rules) {
      for (const [i, r] of doc.rules.entries()) {
        if (!r.flag || !r.set) fail(`copy_flags_rules.json: rule[${i}] missing flag/set`)
      }
    }
    ok('copy_flags_rules.json looks valid')
  } else {
    console.log('ℹ docs/personalization/copy_flags_rules.json not found (optional)')
  }
} catch (e) { fail(e.message) }

// Validate cq_variants_v1.json
try {
  const doc = readJson('docs/personalization/cq_variants_v1.json')
  if (doc) {
    const allowedTop = new Set(['version','steps'])
    for (const k of Object.keys(doc)) if (!allowedTop.has(k)) fail(`cq_variants_v1.json: unknown key ${k}`)
    if (typeof doc.version !== 'string') fail('cq_variants_v1.json: missing version')
    if (!Array.isArray(doc.steps)) fail('cq_variants_v1.json: steps must be array')
    for (const [i, s] of doc.steps.entries()) {
      const okKeys = new Set(['step_id','base','variants','fallback'])
      for (const k of Object.keys(s)) if (!okKeys.has(k)) fail(`cq_variants_v1.json: steps[${i}] unknown key ${k}`)
      if (!s.step_id || !s.base || typeof s.base.text !== 'string' || !s.base.copy_variant_id) fail(`cq_variants_v1.json: steps[${i}] missing required fields`)
      if (s.variants) {
        if (!Array.isArray(s.variants)) fail(`cq_variants_v1.json: steps[${i}].variants must be array`)
        for (const [j, v] of s.variants.entries()) {
          const vk = new Set(['copy_variant_id','conditions','pairing_overlays','text'])
          for (const k of Object.keys(v)) if (!vk.has(k)) fail(`cq_variants_v1.json: steps[${i}].variants[${j}] unknown key ${k}`)
          if (!v.copy_variant_id || typeof v.text !== 'string') fail(`cq_variants_v1.json: steps[${i}].variants[${j}] missing id/text`)
        }
      }
      if (s.fallback && !s.fallback.copy_variant_id) fail(`cq_variants_v1.json: steps[${i}].fallback missing copy_variant_id`)
    }
    ok('cq_variants_v1.json looks valid')
  } else {
    console.log('ℹ docs/personalization/cq_variants_v1.json not found (optional)')
  }
} catch (e) { fail(e.message) }

// Validate ui_strings.en-US.json
try {
  const doc = readJson('docs/personalization/ui_strings.en-US.json')
  if (doc) {
    const required = [
      'personalize.card.title',
      'personalize.card.body',
      'personalize.card.cta_start',
      'personalize.card.cta_later',
      'personalize.result.label',
      'personalize.share.tips',
      'personalize.share.labels',
      'personalize.retake',
      'personalize.edit',
      'personalize.disclaimer',
      'personalize.options'
    ]
    for (const k of required) if (!(k in doc)) fail(`ui_strings.en-US.json: missing key ${k}`)
    ok('ui_strings.en-US.json looks valid')
  } else {
    console.log('ℹ docs/personalization/ui_strings.en-US.json not found (optional)')
  }
} catch (e) { fail(e.message) }

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode)
} else {
  console.log('All personalization files passed validation')
}

