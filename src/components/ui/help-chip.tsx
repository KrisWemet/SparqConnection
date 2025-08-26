'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'

interface HelpChipProps {
  title: string
  body: string
  example?: string
  eventName?: string // e.g., help_opened_card_dq
}

export default function HelpChip({ title, body, example, eventName }: HelpChipProps) {
  const [open, setOpen] = useState(false)

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      trackEvent(eventName || 'help_opened', { title })
    }
  }

  return (
    <div className="relative inline-block ml-2 align-middle">
      <button
        onClick={toggle}
        aria-label="Help"
        className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs"
      >
        ?
      </button>
      {open && (
        <div className="absolute z-20 mt-2 right-0 w-72 bg-white border border-gray-200 rounded-lg shadow-md p-3">
          <div className="flex items-start">
            <div className="mr-2">💡</div>
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-1">{title}</div>
              <div className="text-sm text-gray-700">{body}</div>
              {example && (
                <div className="text-xs text-gray-500 mt-2">
                  <span className="font-medium">Example:</span> {example}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

