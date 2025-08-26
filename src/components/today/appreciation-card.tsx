'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import Button from '@/components/ui/button'
import HelpChip from '@/components/ui/help-chip'
import WhyHint from '@/components/ui/why-hint'
import { copy } from '@/content/copy/en-US'

interface AppreciationCardProps {
  templates: string[]
  onComplete?: () => void
}

export default function AppreciationCard({ templates, onComplete }: AppreciationCardProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<'text' | 'voice' | 'in-person'>('text')
  const [isSent, setIsSent] = useState(false)

  // Default templates if none provided
  const defaultTemplates = [
    "I noticed how you [specific thing] today, and it made me feel [emotion].",
    "Thank you for [action]. It really helped me [impact].",
    "I love the way you [quality/behavior]. It makes our relationship [positive effect].",
    "I'm grateful you [recent action] - it showed me [what it meant to you]."
  ]

  const availableTemplates = templates.length > 0 ? templates : defaultTemplates

  const handleTemplateSelect = (template: string) => {
    setSelectedTemplate(template)
    setCustomMessage(template)
    trackEvent('appreciation_template_selected', { 
      template_preview: template.slice(0, 30) 
    })
  }

  const handleSend = () => {
    if (!customMessage.trim()) {
      alert('Please write your appreciation message first.')
      return
    }

    setIsSent(true)
    trackEvent('appreciation_sent', {
      method: deliveryMethod,
      is_custom: !availableTemplates.includes(customMessage),
      message_length: customMessage.length
    })
    onComplete?.()

    // TODO: Integrate with actual delivery methods
    console.log('Sending appreciation:', {
      message: customMessage,
      method: deliveryMethod
    })
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessage)
    trackEvent('appreciation_copied')
    alert('Copied to clipboard!')
  }

  
  if (isSent) {
    return (
      <div id="say-card" className="bg-white rounded-lg p-4 border shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <div>
            <div className="text-sm font-medium text-gray-900">Say what you noticed</div>
            <div className="text-xs text-gray-600">Sent via {deliveryMethod === 'in-person' ? 'In person' : deliveryMethod}</div>
          </div>
        </div>
        <button
          onClick={() => setIsSent(false)}
          className="text-sm text-blue-600 hover:text-blue-800"
          aria-label="Edit appreciation"
        >
          Edit
        </button>
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
        <div className="text-sm text-gray-500">6/7</div>
      </div>
      <p className="text-sm text-gray-600 mb-4">{copy.cards.thanks.subtitle}</p>

      {/* Templates */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Choose a starting point:</h3>
        <div className="space-y-2">
          {availableTemplates.map((template, index) => (
            <button
              key={index}
              onClick={() => handleTemplateSelect(template)}
              className={`w-full p-3 text-left border rounded-lg transition-colors text-sm ${
                selectedTemplate === template
                  ? 'border-pink-300 bg-pink-50 text-pink-900'
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
        <label className="block text-sm font-medium text-gray-900 mb-2">{copy.cards.thanks.title}</label>
        <textarea
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder="Write something specific you appreciate about your partner..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
          rows={4}
        />
        <p className="text-xs text-gray-500 mt-1">
          {customMessage.length} characters
        </p>
      </div>

      {/* Delivery Method */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">How would you like to share this?</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'text', label: 'Text', icon: '💬' },
            { key: 'voice', label: 'Voice', icon: '🗣️' },
            { key: 'in-person', label: 'In Person', icon: '💕' }
          ].map((method) => (
            <button
              key={method.key}
              onClick={() => setDeliveryMethod(method.key as 'text' | 'voice' | 'in-person')}
              className={`p-3 border rounded-lg text-center transition-colors ${
                deliveryMethod === method.key
                  ? 'border-pink-300 bg-pink-50 text-pink-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="text-lg mb-1">{method.icon}</div>
              <div className="text-sm font-medium">{method.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button onClick={handleSend} disabled={!customMessage.trim()} className="w-full">{deliveryMethod === 'text' ? 'Send Message' : deliveryMethod === 'voice' ? 'Prepare to Say' : 'Ready to Share'}</Button>

        {deliveryMethod === 'text' && customMessage.trim() && (
          <Button variant="outline" onClick={handleCopyMessage} className="w-full text-sm">{copy.cards.thanks.copy}</Button>
        )}
      </div>

      <WhyHint text={copy.cards.thanks.why} />
    </div>
  )
}
