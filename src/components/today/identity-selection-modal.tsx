'use client'

import { useState, useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

interface IdentitySelectionModalProps {
  isOpen: boolean
  onClose: () => void
  currentIdentity: string
  isPrivate: boolean
  onIdentitySelected: (identity: string, isPrivate: boolean) => void
}

interface IdentityData {
  current_identity: string
  is_private: boolean
  available_identities: string[]
  has_premium_access: boolean
  premium_identities_count: number
}

export default function IdentitySelectionModal({ 
  isOpen, 
  onClose, 
  currentIdentity, 
  isPrivate,
  onIdentitySelected 
}: IdentitySelectionModalProps) {
  const [identityData, setIdentityData] = useState<IdentityData | null>(null)
  const [selectedIdentity, setSelectedIdentity] = useState(currentIdentity)
  const [selectedPrivate, setSelectedPrivate] = useState(isPrivate)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchIdentities()
    }
  }, [isOpen])

  const fetchIdentities = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/identity/select')
      if (response.ok) {
        const data = await response.json()
        setIdentityData(data)
        setSelectedIdentity(data.current_identity)
        setSelectedPrivate(data.is_private)
      }
    } catch (error) {
      console.error('Error fetching identities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedIdentity || isSaving) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/identity/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity: selectedIdentity,
          is_private: selectedPrivate
        })
      })

      const data = await response.json()

      if (response.ok) {
        onIdentitySelected(selectedIdentity, selectedPrivate)
        trackEvent('identity_selected', {
          new_identity: selectedIdentity,
          is_private: selectedPrivate,
          had_premium_access: identityData?.has_premium_access
        })
        onClose()
      } else {
        console.error('Failed to save identity:', data.error)
        if (data.upgrade_required) {
          alert('This identity requires a Premium subscription. Upgrade to unlock more identities!')
        } else {
          alert(data.message || 'Failed to save identity')
        }
      }
    } catch (error) {
      console.error('Error saving identity:', error)
      alert('Failed to save identity. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Choose Your Identity</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        {isLoading ? (
          <div className="p-6 text-center">
            <div className="text-gray-500">Loading identities...</div>
          </div>
        ) : (
          <>
            {/* Identity Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 gap-3 mb-6">
                {identityData?.available_identities.map((identity) => {
                  const isPremiumIdentity = identityData?.has_premium_access === false && 
                    !['Mindful Partner', 'Caring Listener', 'Supportive Companion', 'Loving Friend'].includes(identity)
                  
                  return (
                    <button
                      key={identity}
                      onClick={() => setSelectedIdentity(identity)}
                      disabled={isPremiumIdentity}
                      className={`p-3 text-left rounded-lg border transition-colors ${
                        selectedIdentity === identity
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : isPremiumIdentity
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{identity}</span>
                        {isPremiumIdentity && (
                          <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                            Premium
                          </span>
                        )}
                        {selectedIdentity === identity && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Premium Upsell */}
              {identityData && !identityData.has_premium_access && identityData.premium_identities_count > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-orange-900 mb-1">
                    Unlock {identityData.premium_identities_count} More Identities
                  </h3>
                  <p className="text-sm text-orange-700 mb-3">
                    Discover more ways to express yourself with Premium identities like &quot;Deep Thinker&quot;, &quot;Creative Dreamer&quot;, and many more.
                  </p>
                  <button
                    onClick={() => {
                      trackEvent('identity_upgrade_clicked', { from: 'identity_modal' })
                      window.open('/pricing?upgrade=premium', '_blank')
                    }}
                    className="text-sm font-medium text-orange-600 hover:text-orange-700"
                  >
                    Upgrade to Premium →
                  </button>
                </div>
              )}

              {/* Privacy Toggle */}
              <div className="flex items-center justify-between mb-6 p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Visible to partner</p>
                  <p className="text-xs text-gray-500">Your partner can see this identity</p>
                </div>
                <button
                  onClick={() => setSelectedPrivate(!selectedPrivate)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                    selectedPrivate ? 'bg-gray-300' : 'bg-blue-600'
                  }`}
                  role="switch"
                  aria-checked={!selectedPrivate}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      selectedPrivate ? 'translate-x-0' : 'translate-x-4'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || selectedIdentity === currentIdentity && selectedPrivate === isPrivate}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  isSaving || (selectedIdentity === currentIdentity && selectedPrivate === isPrivate)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isSaving ? 'Saving...' : 'Save Identity'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}