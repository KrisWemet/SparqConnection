'use client'

import { useState } from 'react'

interface WhyHintProps {
  text: string
  initiallyOpen?: boolean
}

export default function WhyHint({ text, initiallyOpen = false }: WhyHintProps) {
  const [open, setOpen] = useState(initiallyOpen)
  return (
    <div className="mt-4 pt-4 border-t">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-gray-700 hover:text-gray-900 font-medium"
        aria-expanded={open}
      >
        {open ? 'Why this matters ▲' : 'Why this matters ▼'}
      </button>
      {open && (
        <div className="mt-2 text-sm text-gray-600">
          {text}
        </div>
      )}
    </div>
  )
}

