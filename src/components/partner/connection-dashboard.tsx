'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { trackEvent } from '@/lib/analytics'

interface PartnerDashboard {
  pair_id: string
  partner: {
    name: string
    email: string
  }
  connection_status: {
    paired_at: string
    current_streak: number
    user_completed_today: boolean
    partner_completed_today: boolean
    activities_today: number
    notes_today: number
  }
}

interface Activity {
  id: string
  activity_type: string
  activity_date: string
  item_type?: string
  item_id?: string
  metadata: Record<string, unknown>
  author: {
    name: string
    email: string
    is_current_user: boolean
  }
  created_at: string
}

interface ConnectionDashboardProps {
  className?: string
}

export default function ConnectionDashboard({ className = '' }: ConnectionDashboardProps) {
  const { user, loading } = useSupabase()
  const [dashboard, setDashboard] = useState<PartnerDashboard | null>(null)
  const [recentActivities, setRecentActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return

    if (!user) {
      setIsLoading(false)
      return
    }

    fetchDashboardData()
  }, [user, loading])

  // Track no connection view (must be before any conditional returns)
  useEffect(() => {
    if (!isLoading && !loading && !dashboard && !error) {
      trackEvent('connection_dashboard_viewed', {
        has_active_connection: false
      })
    }
  }, [isLoading, loading, dashboard, error])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/partner/activity?days=7')
      if (!response.ok) {
        throw new Error('Failed to fetch partner activity')
      }
      
      const data = await response.json()
      setDashboard(data.dashboard)
      setRecentActivities(data.activities.slice(0, 5)) // Show last 5 activities
      
      // Track successful dashboard view
      trackEvent('connection_dashboard_viewed', {
        has_active_connection: true,
        current_streak: data.dashboard?.connection_status?.current_streak || 0,
        user_completed_today: data.dashboard?.connection_status?.user_completed_today || false,
        partner_completed_today: data.dashboard?.connection_status?.partner_completed_today || false,
        activities_count: data.activities?.length || 0
      })
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      
      // Track dashboard error
      trackEvent('connection_dashboard_error', {
        error_type: 'fetch_failed',
        error_message: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className={`bg-white rounded-lg p-6 border shadow-sm ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <h3 className="text-red-800 font-medium">Error loading connection status</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <div className="text-4xl mb-4">💔</div>
        <h3 className="font-medium text-gray-900 mb-2">No Active Connection</h3>
        <p className="text-gray-600 text-sm">
          Connect with your partner to see your relationship dashboard here.
        </p>
        <a
          href="/connections"
          onClick={() => trackEvent('connection_manage_clicked', { from: 'dashboard_no_connection' })}
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
        >
          Manage Connections
        </a>
      </div>
    )
  }

  const formatActivityType = (type: string) => {
    switch (type) {
      case 'ritual_completed': return '✅ Completed daily ritual'
      case 'note_added': return '💬 Added a note'
      case 'appreciation_sent': return '💝 Sent appreciation'
      case 'play_move': return '🎮 Made a play move'
      case 'connection_milestone': return '🎉 Reached milestone'
      default: return type
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays - 1} days ago`
    return date.toLocaleDateString()
  }

  const { connection_status, partner } = dashboard

  return (
    <div className={`bg-white rounded-lg p-6 border shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Connection Status</h3>
          <p className="text-sm text-gray-600">
            Connected with {partner.name || partner.email}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {connection_status.current_streak}
          </div>
          <div className="text-xs text-gray-500">day streak</div>
        </div>
      </div>

      {/* Today's Status */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-2">
            {connection_status.user_completed_today ? '✅' : '⏳'}
          </div>
          <div className="text-sm font-medium text-gray-900">You</div>
          <div className="text-xs text-gray-600">
            {connection_status.user_completed_today ? 'Completed' : 'In progress'}
          </div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-2">
            {connection_status.partner_completed_today ? '✅' : '⏳'}
          </div>
          <div className="text-sm font-medium text-gray-900">
            {partner.name || 'Partner'}
          </div>
          <div className="text-xs text-gray-600">
            {connection_status.partner_completed_today ? 'Completed' : 'In progress'}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-center">
        <div>
          <div className="text-lg font-semibold text-gray-900">
            {connection_status.notes_today}
          </div>
          <div className="text-xs text-gray-600">Notes shared today</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-900">
            {connection_status.activities_today}
          </div>
          <div className="text-xs text-gray-600">Activities today</div>
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivities.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
          <div className="space-y-2">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 text-sm">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900">
                    <span className="font-medium">
                      {activity.author.is_current_user ? 'You' : activity.author.name}
                    </span>
                    {' '}
                    {formatActivityType(activity.activity_type).toLowerCase()}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {formatDate(activity.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Details */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          Connected since {new Date(connection_status.paired_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}