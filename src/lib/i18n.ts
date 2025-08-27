// Client-safe loader: bundle JSON at build time (resolveJsonModule=true)
// If multiple locales are needed, extend to select by locale.
// Default uses en-US file.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - json import typings
import uiStrings from '../../docs/personalization/ui_strings.en-US.json'

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = (uiStrings || {}) as Record<string, string>
  let out = dict[key] ?? key
  if (process.env.NODE_ENV !== 'production' && !(key in dict)) {
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
