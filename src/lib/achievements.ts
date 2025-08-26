import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/analytics'

export interface Achievement {
  id: string
  achievement_key: string
  title: string
  description: string
  badge_icon: string
  earned_at: string
  achievement_type: string
  metadata?: Record<string, unknown>
}

export interface AchievementDefinition {
  id: string
  achievement_key: string
  category: string
  title: string
  description: string
  long_description?: string
  badge_icon: string
  badge_color: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  required_progress: number
  is_couple_achievement: boolean
  unlock_requirements: Record<string, unknown>
  reward_data: Record<string, unknown>
  celebration_config: Record<string, unknown>
}

export interface AchievementProgress {
  achievement_key: string
  current_progress: number
  required_progress: number
  progress_percentage: number
  last_progress_date: string
}

export interface CelebrationConfig {
  confetti?: boolean
  sound?: string
  badge_animation?: 'bounce' | 'spin' | 'pulse' | 'fade'
  special_message?: boolean
  auto_dismiss_ms?: number
}

export type AchievementCategory = 
  | 'relationship_milestone' 
  | 'communication_master' 
  | 'play_discovery' 
  | 'growth_reflection' 
  | 'partnership_excellence'

export class AchievementManager {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.supabase = createClient()
  }

  /**
   * Get all achievements for a user
   */
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    const { data, error } = await this.supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('is_visible', true)
      .order('earned_at', { ascending: false })

    if (error) {
      console.error('Error fetching user achievements:', error)
      return []
    }

    return data || []
  }

  /**
   * Get couple achievements for a pair
   */
  async getCoupleAchievements(pairId: string): Promise<Achievement[]> {
    const { data, error } = await this.supabase
      .from('couple_achievements')
      .select('*')
      .eq('pair_id', pairId)
      .eq('is_visible', true)
      .order('earned_at', { ascending: false })

    if (error) {
      console.error('Error fetching couple achievements:', error)
      return []
    }

    return data || []
  }

  /**
   * Get achievement progress for a user
   */
  async getAchievementProgress(userId: string): Promise<AchievementProgress[]> {
    const { data, error } = await this.supabase
      .from('user_achievement_progress')
      .select('*')
      .eq('user_id', userId)
      .order('last_progress_date', { ascending: false })

    if (error) {
      console.error('Error fetching achievement progress:', error)
      return []
    }

    return (data || []).map(item => ({
      ...item,
      progress_percentage: Math.round((item.current_progress / item.required_progress) * 100)
    }))
  }

  /**
   * Get all available achievement definitions
   */
  async getAchievementDefinitions(category?: AchievementCategory): Promise<AchievementDefinition[]> {
    let query = this.supabase
      .from('achievement_definitions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching achievement definitions:', error)
      return []
    }

    return data || []
  }

  /**
   * Evaluate and award achievements for a user
   */
  async evaluateUserAchievements(userId: string): Promise<{
    success: boolean
    new_achievements: Achievement[]
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .rpc('evaluate_user_achievements', { target_user_id: userId })

      if (error) {
        console.error('Error evaluating achievements:', error)
        return { success: false, new_achievements: [], error: error.message }
      }

      const result = data as { user_id: string; new_achievements: Achievement[]; achievement_count: number }
      
      // Track achievement analytics
      if (result.new_achievements && result.new_achievements.length > 0) {
        result.new_achievements.forEach(achievement => {
          trackEvent('achievement_earned', {
            achievement_key: achievement.achievement_key,
            achievement_title: achievement.title,
            achievement_category: achievement.achievement_type,
            user_id: userId
          })
        })
      }

      return {
        success: true,
        new_achievements: result.new_achievements || []
      }
    } catch (error) {
      console.error('Achievement evaluation failed:', error)
      return { 
        success: false, 
        new_achievements: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Evaluate and award couple achievements
   */
  async evaluateCoupleAchievements(pairId: string): Promise<{
    success: boolean
    new_achievements: Achievement[]
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .rpc('evaluate_couple_achievements', { target_pair_id: pairId })

      if (error) {
        console.error('Error evaluating couple achievements:', error)
        return { success: false, new_achievements: [], error: error.message }
      }

      const result = data as { pair_id: string; new_achievements: Achievement[]; achievement_count: number }
      
      // Track couple achievement analytics
      if (result.new_achievements && result.new_achievements.length > 0) {
        result.new_achievements.forEach(achievement => {
          trackEvent('couple_achievement_earned', {
            achievement_key: achievement.achievement_key,
            achievement_title: achievement.title,
            achievement_category: achievement.achievement_type,
            pair_id: pairId
          })
        })
      }

      return {
        success: true,
        new_achievements: result.new_achievements || []
      }
    } catch (error) {
      console.error('Couple achievement evaluation failed:', error)
      return { 
        success: false, 
        new_achievements: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Record achievement celebration
   */
  async recordCelebration(
    userId: string,
    achievementId: string,
    celebrationType: 'modal' | 'notification' | 'dashboard_highlight' | 'email',
    engagementLevel: 'viewed' | 'dismissed' | 'shared' | 'ignored' = 'viewed',
    celebrationData?: Record<string, unknown>
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('achievement_celebrations')
        .insert({
          user_id: userId,
          achievement_id: achievementId,
          achievement_type: 'individual',
          celebration_type: celebrationType,
          engagement_level: engagementLevel,
          celebration_data: celebrationData || {}
        })

      if (error) {
        console.error('Error recording achievement celebration:', error)
      }

      // Track celebration analytics
      trackEvent('achievement_celebration', {
        celebration_type: celebrationType,
        engagement_level: engagementLevel,
        achievement_id: achievementId,
        user_id: userId
      })
    } catch (error) {
      console.error('Failed to record achievement celebration:', error)
    }
  }

  /**
   * Update achievement progress
   */
  async updateProgress(
    userId: string,
    achievementKey: string,
    progressIncrement: number = 1,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Get current progress
      const { data: existing } = await this.supabase
        .from('user_achievement_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('achievement_key', achievementKey)
        .single()

      if (existing) {
        // Update existing progress
        const { error } = await this.supabase
          .from('user_achievement_progress')
          .update({
            current_progress: existing.current_progress + progressIncrement,
            progress_metadata: metadata || existing.progress_metadata,
            last_progress_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (error) {
          console.error('Error updating achievement progress:', error)
        }
      } else {
        // Get achievement definition to set required_progress
        const { data: definition } = await this.supabase
          .from('achievement_definitions')
          .select('required_progress')
          .eq('achievement_key', achievementKey)
          .single()

        if (definition) {
          // Create new progress record
          const { error } = await this.supabase
            .from('user_achievement_progress')
            .insert({
              user_id: userId,
              achievement_key: achievementKey,
              current_progress: progressIncrement,
              required_progress: definition.required_progress,
              progress_metadata: metadata || {}
            })

          if (error) {
            console.error('Error creating achievement progress:', error)
          }
        }
      }

      // Track progress update
      trackEvent('achievement_progress_updated', {
        achievement_key: achievementKey,
        progress_increment: progressIncrement,
        user_id: userId
      })
    } catch (error) {
      console.error('Failed to update achievement progress:', error)
    }
  }

  /**
   * Get achievement statistics for analytics
   */
  async getAchievementStats(userId: string): Promise<{
    total_achievements: number
    achievements_by_category: Record<string, number>
    achievement_rate: number
    recent_achievements: Achievement[]
  }> {
    try {
      const achievements = await this.getUserAchievements(userId)
      const definitions = await this.getAchievementDefinitions()

      const achievementsByCategory = achievements.reduce((acc, achievement) => {
        acc[achievement.achievement_type] = (acc[achievement.achievement_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const achievementRate = definitions.length > 0 
        ? Math.round((achievements.length / definitions.length) * 100)
        : 0

      const recentAchievements = achievements.slice(0, 5)

      return {
        total_achievements: achievements.length,
        achievements_by_category: achievementsByCategory,
        achievement_rate: achievementRate,
        recent_achievements: recentAchievements
      }
    } catch (error) {
      console.error('Error getting achievement stats:', error)
      return {
        total_achievements: 0,
        achievements_by_category: {},
        achievement_rate: 0,
        recent_achievements: []
      }
    }
  }
}

/**
 * Get the color for an achievement rarity
 */
export function getAchievementRarityColor(rarity: AchievementDefinition['rarity']): string {
  switch (rarity) {
    case 'common': return '#6b7280'
    case 'uncommon': return '#10b981'
    case 'rare': return '#3b82f6'
    case 'epic': return '#8b5cf6'
    case 'legendary': return '#f59e0b'
    default: return '#6b7280'
  }
}

/**
 * Get the display name for an achievement category
 */
export function getAchievementCategoryDisplayName(category: string): string {
  switch (category) {
    case 'relationship_milestone': return 'Relationship Milestones'
    case 'communication_master': return 'Communication Masters'
    case 'play_discovery': return 'Play & Discovery'
    case 'growth_reflection': return 'Growth & Reflection'
    case 'partnership_excellence': return 'Partnership Excellence'
    case 'streak_milestone': return 'Streak Milestones'
    case 'game_master': return 'Game Masters'
    case 'connection_champion': return 'Connection Champions'
    case 'exploration_expert': return 'Exploration Experts'
    case 'consistency_king': return 'Consistency Champions'
    case 'growth_guru': return 'Growth Gurus'
    default: return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
}

/**
 * Check if achievement should trigger celebration
 */
export function shouldCelebrate(celebrationConfig: CelebrationConfig): boolean {
  // Always celebrate new achievements
  return true
}

/**
 * Get celebration animation class
 */
export function getCelebrationAnimationClass(animation?: CelebrationConfig['badge_animation']): string {
  switch (animation) {
    case 'bounce': return 'animate-bounce'
    case 'spin': return 'animate-spin'
    case 'pulse': return 'animate-pulse'
    case 'fade': return 'animate-pulse' // Fallback to pulse for fade
    default: return 'animate-bounce'
  }
}

// Export singleton instance
export const achievementManager = new AchievementManager()