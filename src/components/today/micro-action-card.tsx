'use client'

import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import HelpChip from '@/components/ui/help-chip'
import WhyHint from '@/components/ui/why-hint'
import { copy } from '@/content/copy/en-US'

interface MicroActionCardProps {
  action: string
  onComplete?: () => void
}

export default function MicroActionCard({ action, onComplete }: MicroActionCardProps) {
  const [isDone, setIsDone] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [currentAction, setCurrentAction] = useState(action)
  const [variantId, setVariantId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(`/api/content/cq-step?step_id=cq.micro_action`, { signal: controller.signal })
        if (res.ok) {
          const data = await res.json()
          if (data?.text) setCurrentAction(data.text)
          if (data?.copy_variant_id) setVariantId(data.copy_variant_id)
        }
      } catch {}
    })()
    return () => controller.abort()
  }, [])

  const handleMarkDone = () => {
    setIsDone(true)
    trackEvent('micro_marked_done', { 
      action_preview: currentAction.slice(0, 50) 
    })
    trackEvent('cq_step_completed', { step_id: 'cq.micro_action', copy_variant_id: variantId || 'base' })
    onComplete?.()
  }

  const handleShowDetails = () => {
    setShowDetails(!showDetails)
  }

  return (
    <div className="bg-white rounded-lg p-6 border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-900">{copy.cards.action.title}</h2>
          <HelpChip title={copy.help.action.title} body={copy.help.action.body} eventName="help_opened_card_action" />
        </div>
        <div className="flex items-center">
          {isDone && (
            <div className="text-sm text-green-600 font-medium mr-2">✓ Done</div>
          )}
          <div className="text-sm text-gray-500">4/7</div>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-4">{copy.cards.action.subtitle}</p>

      {/* Action */}
      <div className="mb-6">
        <div className={`border rounded-lg p-4 transition-colors ${
          isDone 
            ? 'border-green-200 bg-green-50' 
            : 'border-orange-200 bg-orange-50'
        }`}>
          <p className={`font-medium leading-relaxed ${
            isDone ? 'text-green-900' : 'text-orange-900'
          }`}>
            {currentAction}
          </p>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          <p>⏱️ Takes about 2 minutes or less</p>
        </div>
      </div>

      {/* Action Button */}
      {!isDone ? (
        <div className="space-y-3">
          <button
            onClick={handleMarkDone}
            className="w-full bg-orange-600 text-white py-2 px-4 rounded-md font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
          >
            {copy.cards.action.done}
          </button>
          
          <button
            onClick={handleShowDetails}
            className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-4 border shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <div>
            <div className="text-sm font-medium text-gray-900">One tiny kind act</div>
            <div className="text-xs text-gray-600">Marked done</div>
          </div>
        </div>
        <button
          onClick={() => setIsDone(false)}
          className="text-sm text-blue-600 hover:text-blue-800"
          aria-label="Edit kind act"
        >
          Edit
        </button>
      </div>
      )}

      {/* Details */}
      {showDetails && !isDone && <WhyHint text={copy.cards.action.why} initiallyOpen />}

      {/* Encouragement for completed */}
      {isDone && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600 text-center">
            ✨ You just made your relationship a little bit stronger
          </p>
        </div>
      )}
    </div>
  )
}
