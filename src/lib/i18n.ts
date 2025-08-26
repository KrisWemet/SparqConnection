import fs from 'fs'
import path from 'path'

let cache: Record<string, any> | null = null
let mtimeMs = 0

function load(locale: string = 'en-US'): Record<string, string> {
  try {
    const file = path.join(process.cwd(), `docs/personalization/ui_strings.${locale}.json`)
    const stat = fs.statSync(file)
    if (!cache || stat.mtimeMs !== mtimeMs) {
      const raw = fs.readFileSync(file, 'utf-8')
      cache = JSON.parse(raw)
      mtimeMs = stat.mtimeMs
    }
    return cache || {}
  } catch {
    return {}
  }
}

export function t(key: string, params?: Record<string, string | number>, locale?: string): string {
  const dict = load(locale)
  let out = (dict && dict[key]) || key
  if (process.env.NODE_ENV !== 'production' && (!dict || !(key in dict))) {
    // eslint-disable-next-line no-console
    console.warn(`[i18n] Missing key: ${key}`)
  }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
    }
  }
  return out
}

