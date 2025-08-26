// lib/streaks.ts
import { createClient as createServerClient } from '@/lib/supabase-server'
import { trackEvent } from './analytics'

export type StreakType = 'daily_ritual' | 'play_engagement' | 'partner_interaction' | 'weekly_connection' | 'monthly_growth'

export interface StreakStatus {
  current_count: number
  longest_count: number
  status: 'inactive' | 'active' | 'active_today' | 'grace_period' | 'broken'
  is_active: boolean
  days_since_activity: number
  days_until_break: number
  grace_periods_available: number
  grace_periods_used: number
  last_activity_date: string
  streak_start_date: string
  next_milestone: StreakMilestone | null
  recent_activity_count: number
  is_new?: boolean
}

export interface StreakMilestone {
  milestone_value: number
  title: string
  description: string
  badge_icon: string
  reward_type: 'badge' | 'feature_unlock' | 'content_unlock'
  reward_data: Record<string, any>
}

export interface Achievement {
  id: string
  achievement_type: string
  achievement_key: string
  title: string
  description: string
  badge_icon: string
  earned_at: string
  metadata: Record<string, any>
  is_visible: boolean
}

export interface StreakUpdate {
  success: boolean
  current_count: number
  grace_period_used: boolean
  achievement_earned: boolean
  achievement_data: StreakMilestone | null
  streak_reset?: boolean
  new_count?: number
  message?: string
}

export class StreakManager {
  private async getSupabaseClient() {
    return await createServerClient()
  }

  /**
   * Get comprehensive streak status for a user
   */
  async getUserStreakStatus(userId: string, streakType: StreakType): Promise<StreakStatus | null> {
    try {
      const supabase = await this.getSupabaseClient()
      const { data, error } = await supabase
        .rpc('calculate_user_streak_status', {
          target_user_id: userId,
          target_streak_type: streakType
        })

      if (error) {
        console.error('Error calculating streak status:', error)
        return null
      }

      trackEvent('streak_status_calculated', {
        user_id: userId,
        streak_type: streakType,
        current_count: data.current_count,
        status: data.status
      })

      return data as StreakStatus
    } catch (error) {
      console.error('Error in getUserStreakStatus:', error)
      return null
    }
  }

  /**
   * Update user streak when they complete an activity
   */
  async updateStreak(
    userId: string, 
    streakType: StreakType, 
    activitySource?: string,
    activityValue: number = 1
  ): Promise<StreakUpdate | null> {
    try {
      const supabase = await this.getSupabaseClient()
      const { data, error } = await supabase
        .rpc('update_user_streak', {
          target_user_id: userId,
          target_streak_type: streakType,
          activity_source: activitySource,
          activity_value: activityValue
        })

      if (error) {
        console.error('Error updating streak:', error)
        return null
      }

      const result = data as StreakUpdate

      // Track streak update event
      trackEvent('streak_updated', {
        user_id: userId,
        streak_type: streakType,
        activity_source: activitySource,
        current_count: result.current_count,
        grace_period_used: result.grace_period_used,
        achievement_earned: result.achievement_earned,
        streak_reset: result.streak_reset
      })

      // Track achievement if earned
      if (result.achievement_earned && result.achievement_data) {
        trackEvent('achievement_earned', {
          user_id: userId,
          achievement_type: 'streak_milestone',
          achievement_key: `${streakType}_${result.achievement_data.milestone_value}`,
          milestone_value: result.achievement_data.milestone_value,
          streak_type: streakType
        })
      }

      return result
    } catch (error) {
      console.error('Error in updateStreak:', error)
      return null
    }
  }

  /**
   * Get all streak statuses for a user
   */
  async getAllUserStreaks(userId: string): Promise<Record<StreakType, StreakStatus>> {
    const streakTypes: StreakType[] = [
      'daily_ritual',
      'play_engagement', 
      'partner_interaction',
      'weekly_connection',
      'monthly_growth'
    ]

    const results: Record<StreakType, StreakStatus> = {} as any

    await Promise.all(
      streakTypes.map(async (type) => {
        const status = await this.getUserStreakStatus(userId, type)
        if (status) {
          results[type] = status
        }
      })
    )

    return results
  }

  /**
   * Get user's achievements
   */
  async getUserAchievements(userId: string, limit: number = 50): Promise<Achievement[]> {
    try {
      const supabase = await this.getSupabaseClient()
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .eq('is_visible', true)
        .order('earned_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching achievements:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getUserAchievements:', error)
      return []
    }
  }

  /**
   * Get recent achievements (last 7 days)
   */
  async getRecentAchievements(userId: string): Promise<Achievement[]> {
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const supabase = await this.getSupabaseClient()
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .eq('is_visible', true)
        .gte('earned_at', sevenDaysAgo.toISOString())
        .order('earned_at', { ascending: false })

      if (error) {
        console.error('Error fetching recent achievements:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getRecentAchievements:', error)
      return []
    }
  }

  /**
   * Get streak milestones for a specific type
   */
  async getStreakMilestones(streakType: StreakType): Promise<StreakMilestone[]> {
    try {
      const supabase = await this.getSupabaseClient()
      const { data, error } = await supabase
        .from('streak_milestones')
        .select('*')
        .eq('streak_type', streakType)
        .eq('is_active', true)
        .order('milestone_value', { ascending: true })

      if (error) {
        console.error('Error fetching milestones:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getStreakMilestones:', error)
      return []
    }
  }

  /**
   * Activity helpers - call these when users complete activities
   */
  async recordDailyRitual(userId: string, activityType: string = 'ritual_completed') {
    return this.updateStreak(userId, 'daily_ritual', activityType)
  }

  async recordPlayEngagement(userId: string, gameType: string) {
    return this.updateStreak(userId, 'play_engagement', `game_${gameType}`)
  }

  async recordPartnerInteraction(userId: string, interactionType: string) {
    return this.updateStreak(userId, 'partner_interaction', interactionType)
  }

  async recordWeeklyConnection(userId: string) {
    return this.updateStreak(userId, 'weekly_connection', 'weekly_goal_completed')
  }

  /**
   * Get streak insights and recommendations
   */
  async getStreakInsights(userId: string): Promise<{
    strongest_streak: { type: StreakType; count: number } | null
    at_risk_streaks: { type: StreakType; days_until_break: number }[]
    recent_achievements: Achievement[]
    next_milestones: { type: StreakType; milestone: StreakMilestone }[]
  }> {
    const allStreaks = await this.getAllUserStreaks(userId)
    const recentAchievements = await this.getRecentAchievements(userId)

    // Find strongest current streak
    let strongestStreak: { type: StreakType; count: number } | null = null
    const atRiskStreaks: { type: StreakType; days_until_break: number }[] = []
    const nextMilestones: { type: StreakType; milestone: StreakMilestone }[] = []

    Object.entries(allStreaks).forEach(([type, status]) => {
      const streakType = type as StreakType
      
      // Track strongest streak
      if (status.is_active && (!strongestStreak || status.current_count > strongestStreak.count)) {
        strongestStreak = { type: streakType, count: status.current_count }
      }

      // Track at-risk streaks
      if (status.is_active && status.days_until_break <= 2) {
        atRiskStreaks.push({ type: streakType, days_until_break: status.days_until_break })
      }

      // Track next milestones
      if (status.next_milestone) {
        nextMilestones.push({ type: streakType, milestone: status.next_milestone })
      }
    })

    return {
      strongest_streak: strongestStreak,
      at_risk_streaks: atRiskStreaks,
      recent_achievements: recentAchievements,
      next_milestones: nextMilestones
    }
  }
}

// Singleton instance
let streakManager: StreakManager | null = null

export function getStreakManager(): StreakManager {
  if (!streakManager) {
    streakManager = new StreakManager()
  }
  return streakManager
}

// Utility functions for UI
export function getStreakStatusColor(status: StreakStatus['status']): string {
  switch (status) {
    case 'active_today':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'active':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'grace_period':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'broken':
      return 'text-red-600 bg-red-50 border-red-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function getStreakStatusMessage(status: StreakStatus): string {
  switch (status.status) {
    case 'active_today':
      return `🔥 ${status.current_count} day streak - completed today!`
    case 'active':
      return `⚡ ${status.current_count} day streak - keep it going!`
    case 'grace_period':
      return `⏰ ${status.current_count} day streak - ${status.days_until_break} days to continue`
    case 'broken':
      return `💔 Streak ended at ${status.longest_count} days - start fresh!`
    case 'inactive':
      return '🌱 Ready to start your streak?'
    default:
      return 'Track your progress'
  }
}

export function getStreakTypeDisplayName(type: StreakType): string {
  switch (type) {
    case 'daily_ritual':
      return 'Daily Ritual'
    case 'play_engagement':
      return 'Play Together'
    case 'partner_interaction':
      return 'Partner Connection'
    case 'weekly_connection':
      return 'Weekly Goals'
    case 'monthly_growth':
      return 'Monthly Growth'
    default:
      return type
  }
}

export function getStreakTypeIcon(type: StreakType): string {
  switch (type) {
    case 'daily_ritual':
      return '✨'
    case 'play_engagement':
      return '🎮'
    case 'partner_interaction':
      return '💝'
    case 'weekly_connection':
      return '📅'
    case 'monthly_growth':
      return '📈'
    default:
      return '⭐'
  }
}