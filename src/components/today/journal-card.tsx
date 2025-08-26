'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import HelpChip from '@/components/ui/help-chip'
import WhyHint from '@/components/ui/why-hint'
import { copy } from '@/content/copy/en-US'

interface JournalCardProps {
  prompt: string
  onComplete?: () => void
}

export default function JournalCard({ prompt, onComplete }: JournalCardProps) {
  const [entry, setEntry] = useState('')
  const [isPrivate, setIsPrivate] = useState(true) // E2EE by default
  const [isSaved, setIsSaved] = useState(false)
  const [wordCount, setWordCount] = useState(0)

  const handleEntryChange = (value: string) => {
    setEntry(value)
    const words = value.trim().split(/\s+/).filter(word => word.length > 0)
    setWordCount(words.length)
  }

  const handlePrivacyToggle = () => {
    const newPrivacy = !isPrivate
    setIsPrivate(newPrivacy)
    trackEvent('journal_privacy_toggled', { 
      is_private: newPrivacy 
    })
    
    if (!newPrivacy) {
      // Warn about partner visibility
      const confirm = window.confirm(
        'Are you sure you want to make this journal entry visible to your partner? This cannot be undone.'
      )
      if (!confirm) {
        setIsPrivate(true)
        return
      }
    }
  }

  const handleSave = () => {
    if (!entry.trim()) {
      alert('Please write something before saving.')
      return
    }

    setIsSaved(true)
    trackEvent('journal_saved', { 
      word_count: wordCount,
      is_private: isPrivate,
      has_content: entry.length > 0
    })
    onComplete?.()
    
    // TODO: Save to database with E2EE if private
    console.log('Saving journal entry:', {
      entry,
      isPrivate,
      encrypted: isPrivate
    })
  }

  return (
    <div id="journal-card" className="bg-white rounded-lg p-6 border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-900">{copy.cards.journal.title}</h2>
          <HelpChip title={copy.help.journal.title} body={copy.help.journal.body} eventName="help_opened_card_journal" />
        </div>
        <div className="flex items-center">
          {isSaved && (
            <div className="text-sm text-green-600 font-medium mr-2">✓ Saved</div>
          )}
          <div className="text-sm text-gray-500">5/7</div>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-4">{copy.cards.journal.subtitle}</p>

      {/* Prompt */}
      <div className="mb-4">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-purple-900 font-medium">
            {prompt}
          </p>
        </div>
      </div>

      {/* Privacy Toggle */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center">
          <div className="mr-3">
            {isPrivate ? (
              <span className="text-lg">🔒</span>
            ) : (
              <span className="text-lg">👥</span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {isPrivate ? 'Private (Encrypted)' : 'Visible to Partner'}
            </p>
            <p className="text-xs text-gray-600">
              {isPrivate 
                ? 'Only you can read this entry' 
                : 'Your partner can see this entry'
              }
            </p>
          </div>
        </div>
        
        <button
          onClick={handlePrivacyToggle}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 ${
            isPrivate ? 'bg-gray-300' : 'bg-purple-600'
          }`}
          role="switch"
          aria-checked={!isPrivate}
          disabled={isSaved}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isPrivate ? 'translate-x-0' : 'translate-x-5'
            }`}
          />
        </button>
      </div>

      {/* Warning for public entries */}
      {!isPrivate && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-yellow-600">⚠️</span>
            </div>
            <div className="ml-2">
              <p className="text-sm text-yellow-800">
                <strong>Visible to partner:</strong> This entry will be stored unencrypted so your partner can read it. This cannot be changed after saving.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Journal Entry */}
      <div className="mb-4">
        <textarea
          value={entry}
          onChange={(e) => handleEntryChange(e.target.value)}
          placeholder="Start writing your thoughts..."
          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none min-h-[120px] text-gray-900"
          disabled={isSaved}
        />
        
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-gray-500">
            {wordCount} words
          </p>
          {isPrivate && (
            <p className="text-xs text-green-600 font-medium">
              🔐 Will be encrypted
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {!isSaved ? (
          <>
            <button
              onClick={handleSave}
              disabled={!entry.trim()}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Entry
            </button>
            
            <div className="text-center">
              <button
                onClick={() => setEntry('')}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear and start over
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">📝</span>
            </div>
            <p className="text-purple-700 font-medium">Entry saved!</p>
            <p className="text-sm text-gray-600 mt-1">
              {isPrivate 
                ? 'Your private thoughts are safely encrypted'
                : 'Your partner can now see this entry'
              }
            </p>
          </div>
        )}
      </div>

      {/* Journal tip */}
      {!isSaved && (
        <div className="mt-4 pt-4 border-t">
          <WhyHint text={copy.cards.journal.why} />
        </div>
      )}
    </div>
  )
}
