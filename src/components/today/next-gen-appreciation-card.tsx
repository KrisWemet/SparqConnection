'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { trackEvent } from '@/lib/analytics'
import HelpChip from '@/components/ui/help-chip'
import WhyHint from '@/components/ui/why-hint'
import { copy } from '@/content/copy/en-US'
import { type DeliveryMethod, type EmotionalTone } from '@/lib/appreciation-delivery'

interface NextGenAppreciationCardProps {
  templates: string[]
  partnerName?: string
  partnerEmail?: string
}

const deliveryMethods: { 
  key: DeliveryMethod
  label: string
  icon: string
  description: string
  available: boolean
}[] = [
  { key: 'in_app', label: 'In App', icon: '📱', description: 'Show in their daily ritual', available: true },
  { key: 'email', label: 'Email', icon: '📧', description: 'Send a beautiful email', available: true },
  { key: 'sms', label: 'Text', icon: '💬', description: 'Send via text message', available: false },
  { key: 'whatsapp', label: 'WhatsApp', icon: '📞', description: 'Send via WhatsApp', available: false },
  { key: 'calendar_event', label: 'Calendar', icon: '📅', description: 'Create a reminder', available: false },
  { key: 'push_notification', label: 'Push', icon: '🔔', description: 'Instant notification', available: false }
]

const emotionalTones: { 
  key: EmotionalTone
  label: string
  icon: string
  description: string
  color: string
}[] = [
  { key: 'loving', label: 'Loving', icon: '💝', description: 'Express your love', color: 'pink' },
  { key: 'grateful', label: 'Grateful', icon: '🙏', description: 'Show appreciation', color: 'green' },
  { key: 'playful', label: 'Playful', icon: '😄', description: 'Be fun and light', color: 'orange' },
  { key: 'supportive', label: 'Supportive', icon: '🤗', description: 'Offer encouragement', color: 'blue' },
  { key: 'proud', label: 'Proud', icon: '🌟', description: 'Celebrate their wins', color: 'purple' },
  { key: 'apologetic', label: 'Apologetic', icon: '💔', description: 'Make things right', color: 'red' },
  { key: 'encouraging', label: 'Encouraging', icon: '✨', description: 'Lift them up', color: 'cyan' }
]

export default function NextGenAppreciationCard({ 
  templates, 
  partnerName = 'your partner',
  partnerEmail 
}: NextGenAppreciationCardProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('in_app')
  const [emotionalTone, setEmotionalTone] = useState<EmotionalTone>('loving')
  const [sendImmediately, setSendImmediately] = useState(true)
  const [isSent, setIsSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Default templates if none provided
  const defaultTemplates = [
    "I noticed how you [specific thing] today, and it made me feel [emotion].",
    "Thank you for [action]. It really helped me [impact].",
    "I love the way you [quality/behavior]. It makes our relationship [positive effect].",
    "I'm grateful you [recent action] - it showed me [what it meant to you].",
    "You make me smile when you [specific behavior or habit].",
    "I feel so lucky to have someone who [quality] like you do."
  ]

  const availableTemplates = templates.length > 0 ? templates : defaultTemplates

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [customMessage])

  const handleTemplateSelect = (template: string) => {
    setSelectedTemplate(template)
    setCustomMessage(template)
    trackEvent('appreciation_template_selected', { 
      template_preview: template.slice(0, 30),
      emotional_tone: emotionalTone
    })
  }

  const handleSend = async () => {
    if (!customMessage.trim()) {
      alert('Please write your appreciation message first.')
      return
    }

    setIsLoading(true)
    setSendStatus('sending')

    try {
      // Get partner ID (this would come from props or context in a real app)
      const partnerResponse = await fetch('/api/user/partner')
      const partnerData = await partnerResponse.json()

      if (!partnerResponse.ok || !partnerData.partner) {
        throw new Error('No partner found')
      }

      // Send the appreciation
      const response = await fetch('/api/appreciation/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: partnerData.partner.user_id,
          messageContent: customMessage,
          deliveryMethod,
          emotionalTone,
          sendImmediately
        })
      })

      if (response.ok) {
        setIsSent(true)
        setSendStatus('sent')
        setShowCelebration(true)
        
        setTimeout(() => setShowCelebration(false), 3000)

        trackEvent('appreciation_sent', {
          method: deliveryMethod,
          emotional_tone: emotionalTone,
          is_custom: !availableTemplates.includes(customMessage),
          message_length: customMessage.length,
          send_immediately: sendImmediately
        })
      } else {
        throw new Error('Failed to send appreciation')
      }
    } catch (error) {
      console.error('Error sending appreciation:', error)
      setSendStatus('error')
      alert('Failed to send your appreciation. Please try again.')
      trackEvent('appreciation_send_failed', {
        error: error instanceof Error ? error.message : 'unknown',
        method: deliveryMethod,
        emotional_tone: emotionalTone
      })
    } finally {
      setIsLoading(false)
      setTimeout(() => setSendStatus('idle'), 3000)
    }
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessage)
    trackEvent('appreciation_copied', {
      emotional_tone: emotionalTone,
      delivery_method: deliveryMethod
    })
    alert('Copied to clipboard!')
  }

  const getToneColor = (tone: EmotionalTone) => {
    const colors = {
      loving: 'pink',
      grateful: 'green',
      playful: 'orange',
      supportive: 'blue',
      proud: 'purple',
      apologetic: 'red',
      encouraging: 'cyan'
    }
    return colors[tone] || 'pink'
  }

  if (isSent) {
    return (
      <div className="bg-white rounded-lg p-6 border shadow-sm relative overflow-hidden">
        {/* Celebration Animation */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center bg-pink-50 bg-opacity-95 z-10"
            >
              <div className="text-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.3, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ duration: 0.6, repeat: 2 }}
                  className="text-6xl mb-4"
                >
                  💝
                </motion.div>
                <h3 className="text-xl font-bold text-pink-700">Appreciation Sent!</h3>
                <p className="text-pink-600">Your love is on its way to {partnerName}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-gray-900">{copy.cards.thanks.title}</h2>
            <HelpChip title={copy.help.thanks.title} body={copy.help.thanks.body} eventName="help_opened_card_thanks" />
          </div>
          <div className="flex items-center">
            <div className="text-sm text-green-600 font-medium mr-2">✓ Sent</div>
            <div className="text-sm text-gray-500">6/7</div>
          </div>
        </div>

        <div className="text-center py-6">
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">{emotionalTones.find(t => t.key === emotionalTone)?.icon || '💝'}</span>
          </div>
          <p className="text-pink-700 font-medium mb-2">Appreciation delivered!</p>
          <p className="text-sm text-gray-600">
            Your {deliveryMethod === 'in_app' ? 'in-app' : deliveryMethod} message is on its way to {partnerName}.
          </p>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 italic">
              "{customMessage.slice(0, 100)}{customMessage.length > 100 ? '...' : ''}"
            </p>
          </div>

          {/* Delivery details */}
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>Delivery method: {deliveryMethods.find(m => m.key === deliveryMethod)?.label}</p>
            <p>Emotional tone: {emotionalTones.find(t => t.key === emotionalTone)?.label}</p>
            <p>Sent: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-6 border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-900">{copy.cards.thanks.title}</h2>
          <HelpChip title={copy.help.thanks.title} body={copy.help.thanks.body} eventName="help_opened_card_thanks" />
        </div>
        <div className="flex items-center space-x-2">
          {sendStatus !== 'idle' && (
            <div className={`text-xs font-medium ${
              sendStatus === 'sending' ? 'text-yellow-600' : 
              sendStatus === 'sent' ? 'text-green-600' : 
              'text-red-500'
            }`}>
              {sendStatus === 'sending' && '💌 Sending...'}
              {sendStatus === 'sent' && '✓ Sent'}
              {sendStatus === 'error' && '⚠ Send failed'}
            </div>
          )}
          <div className="text-sm text-gray-500">6/7</div>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-6">
        Express your appreciation to {partnerName} with a personalized message delivered just the way they prefer.
      </p>

      {/* Emotional Tone Selector */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">How are you feeling?</h3>
        <div className="grid grid-cols-4 gap-2">
          {emotionalTones.slice(0, 4).map((tone) => (
            <button
              key={tone.key}
              onClick={() => setEmotionalTone(tone.key)}
              className={`p-3 border rounded-lg text-center transition-all ${
                emotionalTone === tone.key
                  ? `border-${tone.color}-300 bg-${tone.color}-50 text-${tone.color}-900 shadow-sm`
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title={tone.description}
            >
              <div className="text-lg mb-1">{tone.icon}</div>
              <div className="text-xs font-medium">{tone.label}</div>
            </button>
          ))}
        </div>
        
        {/* Additional tones in expandable section */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-3 gap-2 mt-2">
                {emotionalTones.slice(4).map((tone) => (
                  <button
                    key={tone.key}
                    onClick={() => setEmotionalTone(tone.key)}
                    className={`p-3 border rounded-lg text-center transition-all ${
                      emotionalTone === tone.key
                        ? `border-${tone.color}-300 bg-${tone.color}-50 text-${tone.color}-900 shadow-sm`
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    title={tone.description}
                  >
                    <div className="text-lg mb-1">{tone.icon}</div>
                    <div className="text-xs font-medium">{tone.label}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-gray-500 hover:text-gray-700 mt-2 transition-colors"
        >
          {showAdvanced ? '▲ Show less' : '▼ More emotions'}
        </button>
      </div>

      {/* Templates */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Choose a starting point:</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {availableTemplates.map((template, index) => (
            <button
              key={index}
              onClick={() => handleTemplateSelect(template)}
              className={`w-full p-3 text-left border rounded-lg transition-all text-sm ${
                selectedTemplate === template
                  ? `border-${getToneColor(emotionalTone)}-300 bg-${getToneColor(emotionalTone)}-50 text-${getToneColor(emotionalTone)}-900`
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {template}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Message */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Your appreciation message:
        </label>
        <textarea
          ref={textareaRef}
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder={`Write something specific you appreciate about ${partnerName}...`}
          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none min-h-[100px] transition-all"
          rows={3}
        />
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-gray-500">
            {customMessage.length} characters • {customMessage.split(/\s+/).filter(w => w.length > 0).length} words
          </p>
          <div className="text-xs">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${getToneColor(emotionalTone)}-100 text-${getToneColor(emotionalTone)}-800`}>
              {emotionalTones.find(t => t.key === emotionalTone)?.icon} {emotionalTones.find(t => t.key === emotionalTone)?.label}
            </span>
          </div>
        </div>
      </div>

      {/* Delivery Method */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">How would you like to send this?</h3>
        <div className="grid grid-cols-2 gap-2">
          {deliveryMethods.filter(method => method.available).map((method) => (
            <button
              key={method.key}
              onClick={() => setDeliveryMethod(method.key)}
              className={`p-3 border rounded-lg text-left transition-colors ${
                deliveryMethod === method.key
                  ? 'border-pink-300 bg-pink-50 text-pink-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <span className="text-lg mr-2">{method.icon}</span>
                <div>
                  <div className="text-sm font-medium">{method.label}</div>
                  <div className="text-xs text-gray-600">{method.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
        
        {/* Coming soon methods */}
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">Coming soon:</p>
          <div className="flex flex-wrap gap-1">
            {deliveryMethods.filter(method => !method.available).map((method) => (
              <span
                key={method.key}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600"
              >
                {method.icon} {method.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Timing Options */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={sendImmediately}
              onChange={(e) => setSendImmediately(e.target.checked)}
              className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
            />
            <span className="ml-2 text-sm text-gray-700">Send immediately</span>
          </label>
          
          {!sendImmediately && (
            <span className="text-xs text-gray-500">
              We'll find the perfect time based on their patterns
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleSend}
          disabled={!customMessage.trim() || isLoading}
          className="w-full bg-pink-600 text-white py-3 px-4 rounded-md font-medium hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
              />
              {deliveryMethod === 'email' ? 'Sending Email...' : 
               deliveryMethod === 'in_app' ? 'Delivering...' : 
               'Sending...'}
            </>
          ) : (
            <>
              {emotionalTones.find(t => t.key === emotionalTone)?.icon} 
              {deliveryMethod === 'email' ? ' Send Email' : 
               deliveryMethod === 'in_app' ? ' Send to App' : 
               ' Send Message'}
            </>
          )}
        </button>

        {customMessage.trim() && (
          <button
            onClick={handleCopyMessage}
            className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors"
          >
            📋 Copy Message
          </button>
        )}
      </div>

      <div className="mt-4 pt-4 border-t">
        <WhyHint text="Expressing appreciation strengthens your emotional bond and creates positive momentum in your relationship. Regular appreciation increases relationship satisfaction and helps both partners feel valued." />
      </div>
    </div>
  )
}