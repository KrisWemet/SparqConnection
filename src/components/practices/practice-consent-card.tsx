'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import Button from '@/components/ui/button'

interface PracticeConsentCardProps {
  id: string
  title: string
  minutes: string
  children: React.ReactNode
  date?: string
}

export default function PracticeConsentCard({ id, title, minutes, children, date }: PracticeConsentCardProps) {
  const [started, setStarted] = useState(false)

  const storageKey = date ? `practice:${id}:${date}` : undefined
  const doneToday = (() => {
    try { return storageKey ? localStorage.getItem(storageKey) === 'done' : false } catch { return false }
  })()

  if (doneToday) return null

  const start = () => {
    setStarted(true)
    trackEvent('practice_started', { type: id })
  }
  const skip = () => {
    try { if (storageKey) localStorage.setItem(storageKey, 'done') } catch {}
    trackEvent('practice_skipped', { type: id })
    setStarted(false)
  }

  const finish = () => {
    try { if (storageKey) localStorage.setItem(storageKey, 'done') } catch {}
    trackEvent('practice_completed', { type: id })
    setStarted(false)
  }

  return (
    <div className="bg-white rounded-lg p-6 border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-900">{title} <span className="text-sm text-gray-500">({minutes})</span></h2>
      </div>
      {!started ? (
        <div>
          <p className="text-sm text-gray-700 mb-3">Would you like to try a short, optional exercise to help you feel calmer before a conversation? You can stop at any time.</p>
          <p className="text-xs text-gray-500 mb-4">This is general well‑being guidance, not therapy or medical advice. If you’re in crisis or feel unsafe, contact local emergency services.</p>
          <div className="flex gap-2">
            <Button onClick={start}>Try now</Button>
            <Button variant="outline" onClick={skip}>Skip for now</Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="space-y-3 mb-4">{children}</div>
          <div className="flex gap-2">
            <Button onClick={finish}>Finish</Button>
            <Button variant="outline" onClick={skip}>Stop</Button>
          </div>
        </div>
      )}
    </div>
  )
}

