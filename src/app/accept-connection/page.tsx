'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSupabase } from '@/components/providers/supabase-provider'
import { trackEvent } from '@/lib/analytics'
import { isValidTokenFormat } from '@/lib/crypto'

interface Connection {
  id: string
  partner_email: string
  partner_name: string
  connected_at: string
  status: string
}

function AcceptConnectionContent() {
  const { user, loading } = useSupabase()
  const searchParams = useSearchParams()
  const [inviteCode, setInviteCode] = useState('')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [acceptanceMethod, setAcceptanceMethod] = useState<'token' | 'code'>('code')
  const [isAccepting, setIsAccepting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error'>('error')
  const [connection, setConnection] = useState<Connection | null>(null)

  useEffect(() => {
    if (loading) return

    if (!user) {
      window.location.href = '/auth'
      return
    }

    // Check for secure token first (new system)
    const token = searchParams.get('token')
    if (token && isValidTokenFormat(token)) {
      setInviteToken(token)
      setAcceptanceMethod('token')
      // Auto-accept if token is provided in URL
      handleAcceptByToken(token)
      trackEvent('accept_connection_page_viewed', { 
        method: 'token',
        has_token: true 
      })
      return
    }

    // Fallback to 6-digit code (old system)
    const code = searchParams.get('code')
    if (code) {
      setInviteCode(code)
      setAcceptanceMethod('code')
      // Auto-accept if code is provided in URL
      handleAcceptByCode(code)
      trackEvent('accept_connection_page_viewed', { 
        method: 'code',
        has_code: true 
      })
      return
    }

    // No URL parameters - manual entry mode
    trackEvent('accept_connection_page_viewed', { 
      method: 'manual' 
    })
  }, [user, loading, searchParams])

  const handleAcceptByToken = async (token: string) => {
    setIsAccepting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/connections/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invite_token: token })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Invalid or expired invitation link')
      }

      setConnection(result.connection)
      setMessage('Connection accepted successfully! 🎉')
      setMessageType('success')
      trackEvent('connection_accepted', { 
        method: 'token',
        partner_email: result.connection.partner_email 
      })

      // Auto-redirect to connections page after 3 seconds
      setTimeout(() => {
        window.location.href = '/connections'
      }, 3000)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept invite'
      setMessage(errorMessage)
      setMessageType('error')
      trackEvent('connection_accept_failed', { 
        method: 'token',
        error: errorMessage 
      })
    } finally {
      setIsAccepting(false)
    }
  }

  const handleAcceptByCode = async (code?: string) => {
    const codeToUse = code || inviteCode.trim()
    
    if (!codeToUse) {
      setMessage('Please enter an invite code')
      setMessageType('error')
      return
    }

    if (codeToUse.length !== 6 || !/^\d{6}$/.test(codeToUse)) {
      setMessage('Invite code must be 6 digits')
      setMessageType('error')
      return
    }

    setIsAccepting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/connections/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invite_code: codeToUse })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept invite')
      }

      setConnection(result.connection)
      setMessage('Connection accepted successfully! 🎉')
      setMessageType('success')
      trackEvent('connection_accepted', { 
        method: 'code',
        partner_email: result.connection.partner_email 
      })

      // Auto-redirect to connections page after 3 seconds
      setTimeout(() => {
        window.location.href = '/connections'
      }, 3000)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept invite'
      setMessage(errorMessage)
      setMessageType('error')
      trackEvent('connection_accept_failed', { 
        method: 'code',
        error: errorMessage 
      })
    } finally {
      setIsAccepting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleAcceptByCode()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">✨ Sparq</h1>
          <p className="text-gray-600">Accept Connection Invite</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {!connection ? (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">🤝</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Join Your Partner
                </h2>
                <p className="text-gray-600">
                  {acceptanceMethod === 'token' 
                    ? 'Processing your invitation...' 
                    : 'Enter the 6-digit invite code your partner shared with you'
                  }
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="invite-code" className="block text-sm font-medium text-gray-700 mb-2">
                    Invite Code
                  </label>
                  <input
                    type="text"
                    id="invite-code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the 6-digit code exactly as shared
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isAccepting || inviteCode.length !== 6}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAccepting ? 'Accepting...' : 'Accept Invite'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connected Successfully!
              </h2>
              <p className="text-gray-600 mb-4">
                You are now connected to {connection.partner_name || connection.partner_email}
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-800">
                  <strong>Partner:</strong> {connection.partner_email}<br/>
                  <strong>Connected:</strong> {new Date(connection.connected_at).toLocaleDateString()}
                </p>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Redirecting to your connections page...
              </p>
              <a
                href="/connections"
                className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                Go to Connections
              </a>
            </div>
          )}

          {message && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              messageType === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <div className="mt-6 text-center">
            <a
              href="/today"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Sparq
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AcceptConnectionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AcceptConnectionContent />
    </Suspense>
  )
}