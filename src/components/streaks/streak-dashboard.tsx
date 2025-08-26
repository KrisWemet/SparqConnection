'use client'

import { useState, useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import { 
  getStreakStatusColor, 
  getStreakStatusMessage, 
  getStreakTypeDisplayName, 
  getStreakTypeIcon,
  type StreakType,
  type StreakStatus,
  type Achievement
} from '@/lib/streaks'
import { achievementManager, Achievement as AchievementType } from '@/lib/achievements'
import AchievementMiniCard from '@/components/achievements/achievement-mini-card'

interface StreakInsights {
  strongest_streak: { type: StreakType; count: number } | null
  at_risk_streaks: { type: StreakType; days_until_break: number }[]
  recent_achievements: Achievement[]
  next_milestones: { type: StreakType; milestone: any }[]
}

interface StreakDashboardProps {
  className?: string
  showInsights?: boolean
  showAchievements?: boolean
}

export default function StreakDashboard({ 
  className = '', 
  showInsights = true,
  showAchievements = true 
}: StreakDashboardProps) {
  const [streaks, setStreaks] = useState<Record<StreakType, StreakStatus>>({} as any)
  const [insights, setInsights] = useState<StreakInsights | null>(null)
  const [recentAchievements, setRecentAchievements] = useState<AchievementType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedStreak, setExpandedStreak] = useState<StreakType | null>(null)

  useEffect(() => {
    fetchStreakData()
  }, [])

  const fetchStreakData = async () => {
    try {
      const response = await fetch(`/api/streaks?include_insights=${showInsights}`)
      if (!response.ok) {
        throw new Error('Failed to fetch streaks')
      }
      
      const data = await response.json()
      setStreaks(data.streaks)
      if (data.insights) {
        setInsights(data.insights)
      }
      
      // Fetch recent achievements if enabled
      if (showAchievements) {
        try {
          const achievementResponse = await fetch('/api/achievements')
          if (achievementResponse.ok) {
            const achievementData = await achievementResponse.json()
            setRecentAchievements(achievementData.stats.recent_achievements || [])
          }
        } catch (achievementError) {
          console.error('Error fetching achievements:', achievementError)
        }
      }
    } catch (err) {
      console.error('Error fetching streak data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStreakClick = (streakType: StreakType) => {
    setExpandedStreak(expandedStreak === streakType ? null : streakType)
    trackEvent('streak_detail_viewed', { 
      streak_type: streakType,
      current_count: streaks[streakType]?.current_count || 0
    })
  }

  const renderStreakCard = (type: StreakType, status: StreakStatus) => {
    const isExpanded = expandedStreak === type
    const colorClass = getStreakStatusColor(status.status)

    return (
      <div 
        key={type}
        className={`border rounded-lg p-4 cursor-pointer transition-all ${colorClass} ${
          isExpanded ? 'ring-2 ring-blue-500 ring-opacity-50' : 'hover:shadow-md'
        }`}
        onClick={() => handleStreakClick(type)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getStreakTypeIcon(type)}</div>
            <div>
              <h3 className="font-semibold text-sm">{getStreakTypeDisplayName(type)}</h3>
              <p className="text-xs opacity-75">
                {status.current_count} day{status.current_count !== 1 ? 's' : ''}
                {status.longest_count > status.current_count && (
                  <span className="ml-1">(best: {status.longest_count})</span>
                )}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">
              {status.current_count}
            </div>
            <div className="text-xs opacity-75">
              {status.status === 'active_today' ? '✓' : 
               status.days_until_break > 0 ? `${status.days_until_break}d` : '⚠️'}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-opacity-30 space-y-2">
            <div className="text-xs">
              <p className="font-medium mb-1">{getStreakStatusMessage(status)}</p>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="opacity-75">Started:</span> {status.streak_start_date}
                </div>
                <div>
                  <span className="opacity-75">Last activity:</span> {status.last_activity_date}
                </div>
                {status.grace_periods_available > 0 && (
                  <div className="col-span-2">
                    <span className="opacity-75">Grace periods:</span> {status.grace_periods_available} remaining
                  </div>
                )}
              </div>

              {status.next_milestone && (
                <div className="mt-3 p-2 bg-black bg-opacity-10 rounded">
                  <div className="font-medium">Next milestone:</div>
                  <div className="flex items-center space-x-2">
                    <span>{status.next_milestone.badge_icon}</span>
                    <span>{status.next_milestone.title}</span>
                    <span className="text-xs opacity-75">
                      ({status.next_milestone.milestone_value - status.current_count} more days)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderInsights = () => {
    if (!insights) return null

    return (
      <div className="space-y-4">
        {/* Strongest Streak */}
        {insights.strongest_streak && (
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">🏆</span>
              <h3 className="font-semibold text-green-900">Your Strongest Streak</h3>
            </div>
            <p className="text-green-800">
              {getStreakTypeDisplayName(insights.strongest_streak.type)} - {insights.strongest_streak.count} days strong!
            </p>
          </div>
        )}

        {/* At Risk Streaks */}
        {insights.at_risk_streaks.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-semibold text-yellow-900">Streaks at Risk</h3>
            </div>
            <div className="space-y-1">
              {insights.at_risk_streaks.map((risk) => (
                <p key={risk.type} className="text-yellow-800 text-sm">
                  <span className="font-medium">{getStreakTypeDisplayName(risk.type)}</span> - 
                  {risk.days_until_break === 0 ? ' expires today!' : ` ${risk.days_until_break} day${risk.days_until_break > 1 ? 's' : ''} left`}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Next Milestones */}
        {insights.next_milestones.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">🎯</span>
              <h3 className="font-semibold text-blue-900">Upcoming Milestones</h3>
            </div>
            <div className="space-y-2">
              {insights.next_milestones.slice(0, 3).map((milestone) => (
                <div key={milestone.type} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <span>{milestone.milestone.badge_icon}</span>
                    <span className="text-blue-800">{milestone.milestone.title}</span>
                  </div>
                  <span className="text-blue-600 font-medium">
                    {milestone.milestone.milestone_value - (streaks[milestone.type]?.current_count || 0)} more
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Achievements */}
        {showAchievements && recentAchievements.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🎉</span>
                <h3 className="font-semibold text-purple-900">Recent Achievements</h3>
              </div>
              <a 
                href="/achievements" 
                className="text-xs text-purple-600 hover:text-purple-800 font-medium"
              >
                View All →
              </a>
            </div>
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {recentAchievements.slice(0, 3).map((achievement) => (
                <div key={achievement.id} className="flex-shrink-0">
                  <AchievementMiniCard
                    achievement={achievement}
                    size="small"
                    showCategory={false}
                    onClick={() => window.location.href = '/achievements'}
                  />
                </div>
              ))}
            </div>
            {recentAchievements.length > 3 && (
              <div className="mt-3 text-center">
                <a 
                  href="/achievements"
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  +{recentAchievements.length - 3} more achievements
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg p-6 border shadow-sm ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <h3 className="text-red-800 font-medium">Unable to load streak data</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={fetchStreakData}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  const activeStreaks = Object.entries(streaks).filter(([_, status]) => status.is_active)

  return (
    <div className={`bg-white rounded-lg p-6 border shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Your Streaks</h2>
        <div className="text-sm text-gray-500">
          {activeStreaks.length} of {Object.keys(streaks).length} active
        </div>
      </div>

      {/* Insights Section */}
      {showInsights && insights && (
        <div className="mb-6">
          {renderInsights()}
        </div>
      )}

      {/* Streaks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(streaks).map(([type, status]) => 
          renderStreakCard(type as StreakType, status)
        )}
      </div>

      {/* Empty State */}
      {Object.keys(streaks).length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🌱</div>
          <h3 className="font-medium text-gray-900 mb-2">Start Your First Streak!</h3>
          <p className="text-gray-600 text-sm">
            Complete daily activities to build consistency and earn achievements.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Streaks help build lasting relationship habits. Keep going! 💪
        </p>
      </div>
    </div>
  )
}