'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { trackEvent } from '@/lib/analytics'
import ConnectionDashboard from '@/components/partner/connection-dashboard'
import StreakDashboard from '@/components/streaks/streak-dashboard'

interface ActiveConnection {
  id: string
  partner_id: string | null
  partner_email: string
  partner_name: string | null
  status: string
  connected_at: string
  connection_type: 'active'
}

interface PendingInvite {
  id: string
  invitee_email?: string
  inviter_email?: string
  inviter_name?: string
  invite_code?: string
  expires_at?: string
  created_at: string
  connection_type: 'pending_outgoing' | 'pending_incoming'
}

interface ConnectionsData {
  active_connections: ActiveConnection[]
  outgoing_invites: PendingInvite[]
  incoming_invites: PendingInvite[]
}

export default function ConnectionsPage() {
  const { user, loading } = useSupabase()
  const [connections, setConnections] = useState<ConnectionsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return

    if (!user) {
      window.location.href = '/auth'
      return
    }

    fetchConnections()
    trackEvent('connections_page_viewed')
  }, [user, loading])

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/connections')
      if (!response.ok) {
        throw new Error('Failed to fetch connections')
      }
      const data = await response.json()
      setConnections(data)
    } catch (err) {
      console.error('Error fetching connections:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviteLoading(true)
    setInviteMessage(null)

    try {
      const response = await fetch('/api/connections/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: inviteEmail.toLowerCase().trim() })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invite')
      }

      setInviteMessage(result.instructions || 'Invite sent successfully!')
      setInviteEmail('')
      trackEvent('connection_invite_sent', { invitee_email: inviteEmail })
      
      // Refresh connections
      await fetchConnections()
    } catch (err) {
      setInviteMessage(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRemoveConnection = async (connectionId: string, type: 'pair' | 'invite') => {
    if (!confirm('Are you sure you want to remove this connection?')) return

    try {
      const response = await fetch(`/api/connections/${connectionId}?type=${type}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to remove connection')
      }

      trackEvent('connection_removed', { connection_id: connectionId, type })
      await fetchConnections()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove connection')
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading connections...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto pt-8 pb-12 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">✨ Connections</h1>
          <p className="text-gray-600">Manage your Sparq connections</p>
        </div>

        {/* Connection Dashboard */}
        <ConnectionDashboard className="mb-6" />

        {/* Streak Dashboard */}
        <StreakDashboard className="mb-6" />

        {/* Invite Form */}
        <div className="bg-white rounded-lg p-6 border shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite a Partner</h2>
          
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="partner@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={inviteLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviteLoading ? 'Sending...' : 'Send Invite'}
            </button>
          </form>

          {inviteMessage && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              inviteMessage.includes('successfully') || inviteMessage.includes('Share this')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {inviteMessage}
            </div>
          )}
        </div>

        {/* Active Connections */}
        {connections?.active_connections && connections.active_connections.length > 0 && (
          <div className="bg-white rounded-lg p-6 border shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Connections</h2>
            <div className="space-y-4">
              {connections.active_connections.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {connection.partner_name || connection.partner_email}
                    </h3>
                    <p className="text-sm text-gray-500">{connection.partner_email}</p>
                    <p className="text-xs text-gray-400">
                      Connected {new Date(connection.connected_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveConnection(connection.id, 'pair')}
                    className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incoming Invites */}
        {connections?.incoming_invites && connections.incoming_invites.length > 0 && (
          <div className="bg-white rounded-lg p-6 border shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Incoming Invites</h2>
            <div className="space-y-4">
              {connections.incoming_invites.map((invite) => (
                <div key={invite.id} className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {invite.inviter_name || invite.inviter_email}
                      </h3>
                      <p className="text-sm text-gray-500">{invite.inviter_email}</p>
                      <p className="text-xs text-gray-400">
                        Invited {new Date(invite.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <a
                        href={`/accept-connection?code=${invite.invite_code}`}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        Accept
                      </a>
                      <button
                        onClick={() => handleRemoveConnection(invite.id, 'invite')}
                        className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing Invites */}
        {connections?.outgoing_invites && connections.outgoing_invites.length > 0 && (
          <div className="bg-white rounded-lg p-6 border shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Invites</h2>
            <div className="space-y-4">
              {connections.outgoing_invites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{invite.invitee_email}</h3>
                    <p className="text-sm text-gray-500">Waiting for response</p>
                    <p className="text-xs text-gray-400">
                      Sent {new Date(invite.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveConnection(invite.id, 'invite')}
                    className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {connections && 
         connections.active_connections.length === 0 && 
         connections.incoming_invites.length === 0 && 
         connections.outgoing_invites.length === 0 && (
          <div className="bg-white rounded-lg p-8 border shadow-sm text-center">
            <div className="mb-4">
              <div className="text-6xl mb-4">🤝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No connections yet</h3>
              <p className="text-gray-600 mb-4">
                Start by inviting your partner using their email address above.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="text-center mt-8">
          <a
            href="/today"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Today
          </a>
        </div>
      </div>
    </div>
  )
}