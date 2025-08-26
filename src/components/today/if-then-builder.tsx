'use client'

import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

type Preset = { if: string; then: string }

const PRESETS: Preset[] = [
  { if: 'I feel tense', then: 'I will take 1 slow breath' },
  { if: 'my partner shares a win', then: 'I will name one impact I noticed' },
  { if: 'we pass in the kitchen', then: 'I will give a warm smile' },
]

export default function IfThenBuilder({ date, onSaved }: { date: string; onSaved?: () => void }) {
  const storageKey = `ifthen:${date}`
  const [ifPart, setIfPart] = useState('')
  const [thenPart, setThenPart] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const obj = JSON.parse(raw)
        if (obj?.if && obj?.then) {
          setIfPart(obj.if)
          setThenPart(obj.then)
          setSaved(true)
        }
      }
    } catch {}
  }, [storageKey])

  const save = () => {
    if (!ifPart.trim() || !thenPart.trim()) return
    const payload = { if: ifPart.trim(), then: thenPart.trim(), saved_at: new Date().toISOString() }
    try { localStorage.setItem(storageKey, JSON.stringify(payload)) } catch {}
    setSaved(true)
    trackEvent('if_then_created', { if: ifPart.slice(0, 40), then: thenPart.slice(0, 40) })
    onSaved?.()
  }

  return (
    <div className="bg-white rounded-lg p-4 border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-gray-900">Make it easy</h3>
        {saved && <span className="text-xs text-green-700">✓ Saved</span>}
      </div>
      <p className="text-sm text-gray-600 mb-3">If–Then plan helps follow through.</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setIfPart(p.if); setThenPart(p.then); setSaved(false) }}
            className="px-3 py-1.5 rounded-full border border-gray-300 text-sm text-gray-800 hover:bg-gray-50"
          >
            {`If ${p.if} → then ${p.then}`}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-sm text-gray-900 font-medium">If I…</label>
          <input
            value={ifPart}
            onChange={(e) => { setIfPart(e.target.value); setSaved(false) }}
            placeholder="feel tense / get distracted / …"
            className="mt-1 w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="text-sm text-gray-900 font-medium">Then I will…</label>
          <input
            value={thenPart}
            onChange={(e) => { setThenPart(e.target.value); setSaved(false) }}
            placeholder="take 1 slow breath / say thank you / …"
            className="mt-1 w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={!ifPart.trim() || !thenPart.trim()}
          className="px-4 py-2 rounded-md bg-gray-900 text-white disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Save plan
        </button>
      </div>
    </div>
  )
}

