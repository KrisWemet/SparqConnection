'use client'

import { useState, useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import Button from '@/components/ui/button'
import HelpChip from '@/components/ui/help-chip'
import WhyHint from '@/components/ui/why-hint'
import { copy } from '@/content/copy/en-US'
import { t } from '@/lib/i18n'
import PartnerNotesThread from '@/components/partner/partner-notes-thread'

interface DailyQuestionCardProps {
  question: string
  tags: string[]
  date?: string // Add date prop to use as item_id
  onComplete?: () => void
  benefitsReassurance?: boolean
  prefersSpace?: boolean
  topLove?: string
}

export default function DailyQuestionCard({ question, tags, date, onComplete, benefitsReassurance, prefersSpace, topLove }: DailyQuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(question)
  const [currentTags, setCurrentTags] = useState(tags)
  const [isSwapping, setIsSwapping] = useState(false)
  const [hasSwapped, setHasSwapped] = useState(false)
  const [variantId, setVariantId] = useState<string | null>(null)

  const itemId = date || new Date().toISOString().split('T')[0]

  // Check if question is already saved on mount
  useEffect(() => {
    checkIfSaved()
  }, [itemId]) // eslint-disable-line react-hooks/exhaustive-deps

  const checkIfSaved = async () => {
    try {
      const response = await fetch(`/api/saves?item_type=dq&limit=100`)
      if (response.ok) {
        const { saves } = await response.json()
        const isAlreadySaved = saves.some((save: { item_id: string; item_type: string }) => 
          save.item_id === itemId && save.item_type === 'dq'
        )
        setIsSaved(isAlreadySaved)
      }
    } catch (error) {
      console.error('Error checking if question is saved:', error)
    }
  }

  const handleExpand = () => {
    setIsExpanded(true)
    trackEvent('dq_viewed', { tags: tags.join(',') })
    onComplete?.()
  }

  // Load content-API variant once expanded
  useEffect(() => {
    if (!isExpanded) return
    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(`/api/content/cq-step?step_id=cq.daily_question`, { signal: controller.signal })
        if (res.ok) {
          const data = await res.json()
          if (data?.text) setCurrentQuestion(data.text)
          if (data?.copy_variant_id) setVariantId(data.copy_variant_id)
        }
      } catch {}
    })()
    return () => controller.abort()
  }, [isExpanded])

  const handleSave = async () => {
    if (isSaving || isSaved) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/saves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_type: 'dq',
          item_id: itemId,
          content: {
            question,
            tags,
            saved_at: new Date().toISOString()
          }
        })
      })

      if (response.ok) {
        setIsSaved(true)
        trackEvent('dq_saved', { 
          question_preview: question.slice(0, 50),
          tags: tags.join(',')
        })
        trackEvent('cq_completed', {
          item_id: itemId,
          tags: tags.join(',')
        })
        trackEvent('cq_step_completed', {
          step_id: 'cq.daily_question',
          copy_variant_id: variantId || 'base'
        })
      } else {
        const errorData = await response.json()
        if (errorData.alreadyExists) {
          setIsSaved(true)
        } else {
          console.error('Failed to save question:', errorData.error)
        }
      }
    } catch (error) {
      console.error('Error saving question:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSwap = async () => {
    if (isSwapping || hasSwapped) return

    setIsSwapping(true)
    try {
      const response = await fetch('/api/daily/alternative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_question: currentQuestion,
          tags: currentTags,
          date: itemId
        })
      })

      const data = await response.json()

      if (response.ok) {
        setCurrentQuestion(data.question)
        setCurrentTags(data.tags)
        setHasSwapped(true)
        setIsSaved(false) // Reset saved status for new question
        trackEvent('dq_swapped', { 
          original_tags: tags.join(','),
          new_tags: data.tags.join(','),
          success: true
        })
      } else {
        console.error('Failed to swap question:', data.error)
        alert(data.message || 'Failed to swap question. Please try again.')
        trackEvent('dq_swap_failed', { 
          error: data.error,
          original_tags: tags.join(',')
        })
      }
    } catch (error) {
      console.error('Error swapping question:', error)
      alert('Failed to swap question. Please try again.')
    } finally {
      setIsSwapping(false)
    }
  }

  const handleNotesToggle = () => {
    setShowNotes(!showNotes)
    if (!showNotes) {
      trackEvent('dq_notes_opened')
    }
  }

  if (!isExpanded) {
    return (
      <div id="dq-card" className="bg-white rounded-lg p-6 border shadow-sm">
        {benefitsReassurance && (
          <div className="mb-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            I get why this matters to you. Here’s what I’m hearing…
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-gray-900">{copy.cards.dq.title}</h2>
            <HelpChip title={copy.help.dq.title} body={copy.help.dq.body} eventName="help_opened_card_dq" />
          </div>
          <div className="text-sm text-gray-500">3/7</div>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-1">{copy.cards.dq.subtitle}</p>
          <WhyHint text={copy.cards.dq.why} />
          
          {currentTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {currentTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <Button onClick={handleExpand} className="w-full">Reveal question</Button>
      </div>
    )
  }

  return (
    <div id="dq-card" className="bg-white rounded-lg p-6 border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-900">{copy.cards.dq.title}</h2>
          <HelpChip title={copy.help.dq.title} body={copy.help.dq.body} eventName="help_opened_card_dq" />
        </div>
        <div className="text-sm text-gray-500">3/7</div>
      </div>
      <p className="text-sm text-gray-600 mb-2">{copy.cards.dq.subtitle}</p>
      {benefitsReassurance && (
        <div className="mb-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          I get why this matters to you. Here’s what I’m hearing…
        </div>
      )}

      {/* The Question */}
      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-blue-900 font-medium text-lg leading-relaxed">
            {currentQuestion}
          </p>
          {hasSwapped && (
            <div className="mt-2 text-xs text-blue-600 italic">
              ✨ Alternative question
            </div>
          )}
        </div>

        {currentTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {currentTags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={`grid ${prefersSpace ? 'grid-cols-4' : 'grid-cols-3'} gap-2 mb-4`}>
        <Button variant="outline" onClick={handleSave} disabled={isSaving || isSaved} className="w-full text-sm">
          {isSaving ? '…' : isSaved ? '✓ Saved' : 'Save'}
        </Button>
        <Button variant="outline" onClick={handleSwap} disabled={isSwapping || hasSwapped} className="w-full text-sm">
          {isSwapping ? '…' : hasSwapped ? '✓ Swapped' : copy.cards.dq.swap}
        </Button>
        <Button variant="outline" onClick={handleNotesToggle} className="w-full text-sm">Notes</Button>
        {prefersSpace && (
          <Button
            variant="outline"
            onClick={() => {
              try {
                const at = new Date(Date.now() + 15 * 60 * 1000)
                localStorage.setItem('dq_pin_until', at.toISOString())
              } catch {}
              trackEvent('pause_pin', { item_id: itemId })
              alert('Pinned. “I’ll circle back at 15 minutes.”')
            }}
            className="w-full text-sm"
          >
            Pause & Pin
          </Button>
        )}
      </div>

      {/* Words of Affirmation nudge */}
      {topLove === 'words' && (
        <div className="mb-4 p-3 bg-pink-50 border border-pink-200 rounded-md text-sm text-pink-900">
          Try a 1‑sentence gratitude after this: “I really appreciated when you…”
          <div>
            <button
              onClick={() => trackEvent('words_gratitude_suggested', { item_id: itemId })}
              className="mt-2 text-pink-700 underline"
            >
              See other options
            </button>
          </div>
        </div>
      )}

      {/* Clarity quick check */}
      <div className="mb-4">
        <div className="text-sm text-gray-700 mb-2">Did this make sense?</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => trackEvent('dq_clarity_vote', { value: 'yes' })} className="text-sm px-3 py-2">👍 {copy.cards.dq.clarityYes}</Button>
          <Button variant="outline" onClick={() => trackEvent('dq_clarity_vote', { value: 'no' })} className="text-sm px-3 py-2">👎 {copy.cards.dq.clarityNo}</Button>
        </div>
      </div>

      {/* Partner Notes */}
      {showNotes && (
        <PartnerNotesThread
          itemType="dq"
          itemId={date || new Date().toISOString().split('T')[0]}
        />
      )}

      <WhyHint text={copy.cards.dq.why} />
    </div>
  )
}
