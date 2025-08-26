'use client'

import { useState, useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import HelpChip from '@/components/ui/help-chip'
import WhyHint from '@/components/ui/why-hint'
import { copy } from '@/content/copy/en-US'
import IdentitySelectionModal from './identity-selection-modal'

interface IdentityCardProps {
  identity: string
}

export default function IdentityCard({ identity }: IdentityCardProps) {
  const [currentIdentity, setCurrentIdentity] = useState(identity)
  const [isPrivateToday, setIsPrivateToday] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Load current identity and privacy setting on mount
  useEffect(() => {
    loadCurrentIdentity()
  }, [])

  const loadCurrentIdentity = async () => {
    try {
      const response = await fetch('/api/identity/select')
      if (response.ok) {
        const data = await response.json()
        setCurrentIdentity(data.current_identity)
        setIsPrivateToday(data.is_private)
      }
    } catch (error) {
      console.error('Error loading current identity:', error)
    }
  }

  const handlePrivateToggle = async () => {
    const newValue = !isPrivateToday
    setIsPrivateToday(newValue)
    
    try {
      // Save the privacy setting to API
      await fetch('/api/identity/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity: currentIdentity,
          is_private: newValue
        })
      })
      
      trackEvent('identity_privacy_toggled', { 
        private: newValue,
        identity: currentIdentity 
      })
    } catch (error) {
      console.error('Error updating privacy setting:', error)
      // Revert on error
      setIsPrivateToday(!newValue)
    }
  }

  const handleChooseNewIdentity = () => {
    trackEvent('identity_choose_clicked', { current_identity: currentIdentity })
    setShowModal(true)
  }

  const handleIdentitySelected = (newIdentity: string, isPrivate: boolean) => {
    setCurrentIdentity(newIdentity)
    setIsPrivateToday(isPrivate)
  }

  return (
    <div id="identity-card" className="bg-white rounded-lg p-6 border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-900">{copy.cards.identity.title}</h2>
          <HelpChip title={copy.help.identity.title} body={copy.help.identity.body} eventName="help_opened_card_identity" />
        </div>
        <div className="text-sm text-gray-500">1/7</div>
      </div>
      <p className="text-sm text-gray-600 mb-4">{copy.cards.identity.subtitle}</p>

      {/* Identity Chip */}
      <div className="mb-4">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-200">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-blue-900 font-medium">{currentIdentity}</span>
        </div>
      </div>

      {/* Private Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Visible to partner</p>
          <p className="text-xs text-gray-500">Your partner can see this identity</p>
        </div>
        <button
          onClick={handlePrivateToggle}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
            isPrivateToday ? 'bg-gray-300' : 'bg-blue-600'
          }`}
          role="switch"
          aria-checked={!isPrivateToday}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isPrivateToday ? 'translate-x-0' : 'translate-x-5'
            }`}
          />
        </button>
      </div>

      {isPrivateToday && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            🔒 Your identity is private today. Your partner won&apos;t see which identity you&apos;ve chosen.
          </p>
        </div>
      )}

      {/* Choose New Identity Button */}
      <button
        onClick={handleChooseNewIdentity}
        className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        Choose a new identity
        <span className="ml-1 text-xs text-blue-600">(Premium)</span>
      </button>

      {/* Identity Selection Modal */}
      <IdentitySelectionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        currentIdentity={currentIdentity}
        isPrivate={isPrivateToday}
        onIdentitySelected={handleIdentitySelected}
      />
      <WhyHint text={copy.cards.identity.why} />
    </div>
  )
}
