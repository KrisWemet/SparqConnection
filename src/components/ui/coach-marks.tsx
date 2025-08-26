'use client'

import { useEffect, useState } from 'react'

type Step = { target: string; text: string }

export function CoachMarks({ id, steps }: { id: string; steps: Step[] }) {
  const [active, setActive] = useState(0)
  const [visible, setVisible] = useState(false)
  const [trap, setTrap] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const key = `coach_${id}_done`
    if (localStorage.getItem(key) === '1') return
    setVisible(true)
  }, [id])

  const finish = async () => {
    try {
      localStorage.setItem(`coach_${id}_done`, '1')
      await fetch('/api/user/coachmarks/complete', { method: 'POST' })
    } catch {}
    setVisible(false)
  }

  // Simple focus trap
  useEffect(() => {
    if (!visible || !trap) return
    const focusables = trap.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault(); (last as HTMLElement)?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault(); (first as HTMLElement)?.focus()
        }
      }
    }
    trap.addEventListener('keydown', onKey as any)
    ;(first as HTMLElement)?.focus()
    return () => trap.removeEventListener('keydown', onKey as any)
  }, [visible, trap, active])


  if (!visible) return null
  const el = typeof document !== 'undefined' ? document.querySelector(steps[active]?.target) as HTMLElement | null : null
  const rect = el?.getBoundingClientRect()
  const hole = rect ? {
    top: Math.max(8, rect.top - 8 + window.scrollY),
    left: Math.max(8, rect.left - 8 + window.scrollX),
    width: rect.width + 16,
    height: rect.height + 16,
  } : null

  return (
    <div aria-live="polite" role="dialog" aria-modal="true" className="fixed inset-0 z-50">
      {/* Spotlight mask */}
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        onClick={finish}
        style={hole ? {
          WebkitMaskImage: `radial-gradient( circle at ${hole.left + hole.width/2}px ${hole.top + hole.height/2}px, transparent ${Math.max(hole.width, hole.height)/2}px, black ${Math.max(hole.width, hole.height)/2 + 2}px)`,
          maskImage: `radial-gradient( circle at ${hole.left + hole.width/2}px ${hole.top + hole.height/2}px, transparent ${Math.max(hole.width, hole.height)/2}px, black ${Math.max(hole.width, hole.height)/2 + 2}px)`,
        } : {}}
      />
      <div className="absolute" style={{ top: (rect?.bottom || 80) + 8 + window.scrollY, left: (rect?.left || 16) + window.scrollX, right: 16 }}>
        <div ref={setTrap} className="bg-white rounded-lg shadow-lg border p-4 max-w-sm">
          <p className="text-gray-900 text-sm">{steps[active]?.text}</p>
          <div className="mt-3 flex items-center justify-between">
            <button onClick={finish} className="text-sm text-gray-600 hover:text-gray-900">Skip for now</button>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">{active + 1}/{steps.length}</div>
              {active < steps.length - 1 ? (
                <button onClick={() => setActive(active + 1)} className="px-3 py-1 rounded-md bg-gray-900 text-white text-sm">Next</button>
              ) : (
                <button onClick={finish} className="px-3 py-1 rounded-md bg-gray-900 text-white text-sm">Got it</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

