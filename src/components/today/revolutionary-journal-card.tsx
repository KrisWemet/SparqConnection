'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { trackEvent } from '@/lib/analytics'
import HelpChip from '@/components/ui/help-chip'
import WhyHint from '@/components/ui/why-hint'
import { copy } from '@/content/copy/en-US'
import { 
  encryptJournalContent, 
  decryptJournalContent,
  generateEncryptionKey,
  SecureKeyStorage,
  analyzeSentiment,
  extractMoodTags,
  isEncryptionSupported,
  type EncryptionKey,
  type EncryptedData
} from '@/lib/encryption'

interface RevolutionaryJournalCardProps {
  prompt: string
  existingEntry?: {
    id: string
    encryptedContent: string
    iv: string
    encryptionMethod: string
    wordCount: number
    isPrivate: boolean
    isDraft: boolean
  }
}

export default function RevolutionaryJournalCard({ 
  prompt, 
  existingEntry 
}: RevolutionaryJournalCardProps) {
  const [entry, setEntry] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [isSaved, setIsSaved] = useState(false)
  const [isDraft, setIsDraft] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [characterCount, setCharacterCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null)
  const [keyId, setKeyId] = useState<string>('')
  const [sentimentScore, setSentimentScore] = useState<number>(0)
  const [moodTags, setMoodTags] = useState<string[]>([])
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showCelebration, setShowCelebration] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autoSaveRef = useRef<NodeJS.Timeout>()

  // Check encryption support
  const encryptionSupported = isEncryptionSupported()

  // Initialize encryption key and decrypt existing entry
  useEffect(() => {
    const initializeEncryption = async () => {
      if (!encryptionSupported) {
        console.warn('Encryption not supported in this browser')
        return
      }

      try {
        // Get or create encryption key
        const availableKeys = SecureKeyStorage.getAvailableKeys()
        let key: CryptoKey
        let keyIdToUse: string

        if (availableKeys.length > 0) {
          // Use existing key
          keyIdToUse = availableKeys[0]
          key = await SecureKeyStorage.retrieveKey(keyIdToUse) || await (async () => {
            const newKeyData = await generateEncryptionKey()
            await SecureKeyStorage.storeKey(newKeyData.keyId, newKeyData.key)
            return newKeyData.key
          })()
        } else {
          // Generate new key
          const newKeyData = await generateEncryptionKey()
          await SecureKeyStorage.storeKey(newKeyData.keyId, newKeyData.key)
          key = newKeyData.key
          keyIdToUse = newKeyData.keyId
        }

        setEncryptionKey(key)
        setKeyId(keyIdToUse)

        // Decrypt existing entry if provided
        if (existingEntry && key) {
          setIsDecrypting(true)
          try {
            const decrypted = await decryptJournalContent(
              {
                encryptedContent: existingEntry.encryptedContent,
                iv: existingEntry.iv,
                method: existingEntry.encryptionMethod
              },
              key
            )
            setEntry(decrypted)
            setWordCount(existingEntry.wordCount)
            setCharacterCount(decrypted.length)
            setIsPrivate(existingEntry.isPrivate)
            setIsDraft(existingEntry.isDraft)
            setIsSaved(!existingEntry.isDraft)
            
            // Analyze the decrypted content
            const sentiment = analyzeSentiment(decrypted)
            const moods = extractMoodTags(decrypted)
            setSentimentScore(sentiment)
            setMoodTags(moods)
          } catch (error) {
            console.error('Failed to decrypt journal entry:', error)
            trackEvent('journal_decryption_failed', {
              entry_id: existingEntry.id,
              error: 'decryption_failed'
            })
          } finally {
            setIsDecrypting(false)
          }
        }
      } catch (error) {
        console.error('Failed to initialize encryption:', error)
        trackEvent('journal_encryption_init_failed', {
          error: error instanceof Error ? error.message : 'unknown'
        })
      }
    }

    initializeEncryption()
  }, [encryptionSupported, existingEntry])

  // Real-time content analysis
  const handleEntryChange = (value: string) => {
    setEntry(value)
    const words = value.trim().split(/\s+/).filter(word => word.length > 0)
    const newWordCount = words.length
    const newCharCount = value.length
    
    setWordCount(newWordCount)
    setCharacterCount(newCharCount)

    // Analyze sentiment and mood in real-time
    if (value.length > 10) {
      const sentiment = analyzeSentiment(value)
      const moods = extractMoodTags(value)
      setSentimentScore(sentiment)
      setMoodTags(moods)
    }

    // Auto-save draft after 3 seconds of inactivity
    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current)
    }
    
    autoSaveRef.current = setTimeout(() => {
      if (value.trim() && encryptionKey) {
        saveDraft(value)
      }
    }, 3000)
  }

  // Auto-save draft functionality
  const saveDraft = async (content: string) => {
    if (!encryptionKey) return

    try {
      setSaveStatus('saving')
      const encrypted = await encryptJournalContent(content, encryptionKey)
      
      const payload = {
        encryptedContent: encrypted.encryptedContent,
        iv: encrypted.iv,
        encryptionMethod: encrypted.method,
        wordCount,
        characterCount,
        isPrivate,
        sentimentScore,
        moodTags,
        promptType: 'daily' as const,
        promptText: prompt,
        isDraft: true
      }

      const response = await fetch('/api/journal/entries', {
        method: existingEntry ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existingEntry ? { ...payload, id: existingEntry.id } : payload)
      })

      if (response.ok) {
        setSaveStatus('saved')
        setIsDraft(true)
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const handlePrivacyToggle = () => {
    const newPrivacy = !isPrivate
    setIsPrivate(newPrivacy)
    
    trackEvent('journal_privacy_toggled', { 
      is_private: newPrivacy 
    })
    
    if (!newPrivacy) {
      const confirm = window.confirm(
        'Are you sure you want to make this journal entry visible to your partner? This cannot be undone.'
      )
      if (!confirm) {
        setIsPrivate(true)
        return
      }
    }
  }

  const handleSave = async (saveAsDraft = false) => {
    if (!entry.trim() || !encryptionKey) {
      alert('Please write something before saving.')
      return
    }

    setIsLoading(true)
    setSaveStatus('saving')

    try {
      // Encrypt the content
      const encrypted = await encryptJournalContent(entry, encryptionKey)
      
      const payload = {
        encryptedContent: encrypted.encryptedContent,
        iv: encrypted.iv,
        encryptionMethod: encrypted.method,
        wordCount,
        characterCount,
        isPrivate,
        isSharedWithPartner: !isPrivate,
        partnerCanView: !isPrivate,
        sentimentScore,
        moodTags,
        promptType: 'daily' as const,
        promptText: prompt,
        isDraft: saveAsDraft
      }

      const response = await fetch('/api/journal/entries', {
        method: existingEntry ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existingEntry ? { ...payload, id: existingEntry.id } : payload)
      })

      if (response.ok) {
        setIsSaved(true)
        setIsDraft(saveAsDraft)
        setSaveStatus('saved')
        
        if (!saveAsDraft) {
          setShowCelebration(true)
          setTimeout(() => setShowCelebration(false), 3000)
        }
        
        trackEvent('journal_saved', { 
          word_count: wordCount,
          character_count: characterCount,
          is_private: isPrivate,
          is_draft: saveAsDraft,
          sentiment_score: sentimentScore,
          mood_tags: moodTags,
          has_content: entry.length > 0
        })
      } else {
        throw new Error('Failed to save entry')
      }
    } catch (error) {
      console.error('Save failed:', error)
      setSaveStatus('error')
      alert('Failed to save your journal entry. Please try again.')
      trackEvent('journal_save_failed', {
        error: error instanceof Error ? error.message : 'unknown'
      })
    } finally {
      setIsLoading(false)
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const getSentimentColor = () => {
    if (sentimentScore > 0.3) return 'text-green-600'
    if (sentimentScore < -0.3) return 'text-red-500'
    return 'text-yellow-600'
  }

  const getSentimentEmoji = () => {
    if (sentimentScore > 0.5) return '😊'
    if (sentimentScore > 0.2) return '🙂'
    if (sentimentScore < -0.5) return '😢'
    if (sentimentScore < -0.2) return '😐'
    return '😌'
  }

  if (isDecrypting) {
    return (
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full"
          />
          <p className="ml-3 text-purple-600">🔓 Decrypting your journal...</p>
        </div>
      </div>
    )
  }

  return (
    <div id="journal-card" className="bg-white rounded-lg p-6 border shadow-sm relative overflow-hidden">
      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center bg-purple-50 bg-opacity-95 z-10"
          >
            <div className="text-center">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="text-6xl mb-4"
              >
                ✨
              </motion.div>
              <h3 className="text-xl font-bold text-purple-700">Entry Saved!</h3>
              <p className="text-purple-600">Your thoughts are safely encrypted</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-900">{copy.cards.journal.title}</h2>
          <HelpChip title={copy.help.journal.title} body={copy.help.journal.body} eventName="help_opened_card_journal" />
        </div>
        <div className="flex items-center space-x-2">
          {/* Auto-save status */}
          {saveStatus !== 'idle' && (
            <div className={`text-xs font-medium ${
              saveStatus === 'saving' ? 'text-yellow-600' : 
              saveStatus === 'saved' ? 'text-green-600' : 
              'text-red-500'
            }`}>
              {saveStatus === 'saving' && '💾 Saving...'}
              {saveStatus === 'saved' && '✓ Saved'}
              {saveStatus === 'error' && '⚠ Save failed'}
            </div>
          )}
          
          {isSaved && !isDraft && (
            <div className="text-sm text-green-600 font-medium">✓ Saved</div>
          )}
          {isDraft && (
            <div className="text-sm text-yellow-600 font-medium">📝 Draft</div>
          )}
          <div className="text-sm text-gray-500">5/7</div>
        </div>
      </div>

      {!encryptionSupported && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            ⚠️ Your browser doesn't support encryption. Your journal will be stored unencrypted.
          </p>
        </div>
      )}

      <p className="text-sm text-gray-600 mb-4">{copy.cards.journal.subtitle}</p>

      {/* Prompt */}
      <div className="mb-4">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-purple-900 font-medium">{prompt}</p>
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
          disabled={isSaved && !isDraft}
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

      {/* Journal Entry with Smart Analysis */}
      <div className="mb-4">
        <textarea
          ref={textareaRef}
          value={entry}
          onChange={(e) => handleEntryChange(e.target.value)}
          placeholder="Start writing your thoughts..."
          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none min-h-[120px] text-gray-900 transition-all duration-200"
          disabled={isSaved && !isDraft}
          style={{ minHeight: Math.max(120, Math.min(300, textareaRef.current?.scrollHeight || 120)) }}
        />
        
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center space-x-4">
            <p className="text-xs text-gray-500">
              {wordCount} words • {characterCount} characters
            </p>
            
            {/* Real-time sentiment indicator */}
            {entry.length > 10 && (
              <div className={`flex items-center text-xs ${getSentimentColor()}`}>
                <span className="mr-1">{getSentimentEmoji()}</span>
                Mood: {sentimentScore > 0 ? 'Positive' : sentimentScore < 0 ? 'Reflective' : 'Neutral'}
              </div>
            )}
          </div>
          
          {isPrivate && encryptionSupported && (
            <p className="text-xs text-green-600 font-medium">
              🔐 Will be encrypted
            </p>
          )}
        </div>

        {/* Mood tags display */}
        {moodTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {moodTags.map((mood, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full"
              >
                {mood}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {!isSaved || isDraft ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSave(true)}
                disabled={!entry.trim() || isLoading}
                className="bg-gray-600 text-white py-2 px-4 rounded-md font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save Draft'}
              </button>
              
              <button
                onClick={() => handleSave(false)}
                disabled={!entry.trim() || isLoading}
                className="bg-purple-600 text-white py-2 px-4 rounded-md font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Publishing...' : 'Publish Entry'}
              </button>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => setEntry('')}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                disabled={isLoading}
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
            <p className="text-purple-700 font-medium">Entry published!</p>
            <p className="text-sm text-gray-600 mt-1">
              {isPrivate 
                ? 'Your private thoughts are safely encrypted'
                : 'Your partner can now see this entry'
              }
            </p>
            
            {/* Edit button for published entries */}
            <button
              onClick={() => {
                setIsSaved(false)
                setIsDraft(true)
              }}
              className="mt-3 text-sm text-purple-600 hover:text-purple-800 transition-colors"
            >
              Edit this entry
            </button>
          </div>
        )}
      </div>

      {/* Journal tip */}
      {(!isSaved || isDraft) && (
        <div className="mt-4 pt-4 border-t">
          <WhyHint text={copy.cards.journal.why} />
        </div>
      )}
    </div>
  )
}