import { copy } from '@/content/copy/en-US'

const glossaryPairs: Array<[RegExp, string]> = [
  [/\bbids\b/gi, copy.glossary.bids],
  [/\bturn toward\b/gi, copy.glossary.turnToward],
  [/\brepair attempt\b/gi, copy.glossary.repair],
  [/\battachment\b/gi, copy.glossary.attachment],
  [/\bboundaries\b/gi, copy.glossary.boundaries],
  [/\bconsent\b/gi, copy.glossary.consent],
]

export function applyPlainLanguage(text: string, enabled: boolean = true): string {
  if (!enabled || !text) return text
  let out = text
  for (const [pattern, replacement] of glossaryPairs) {
    out = out.replace(pattern, replacement)
  }
  return out
}

export function isPlainLanguageEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const v = window.localStorage.getItem('plainLanguage')
  if (v === null) {
    // default on
    window.localStorage.setItem('plainLanguage', 'true')
    return true
  }
  return v === 'true'
}

