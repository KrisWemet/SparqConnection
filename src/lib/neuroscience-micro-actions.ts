/**
 * Neuroscience-Based Micro-Action System with Hypnotic Programming
 * Uses NLP techniques, hypnotic language patterns, and neuroscience principles
 * to upgrade the user's subconscious relationship patterns
 */

import { createClient as createServerClient } from '@/lib/supabase-server'
import { trackEvent } from './analytics'

export type ActionCategory = 'touch' | 'words' | 'acts' | 'time' | 'gifts' | 'physical' | 'emotional' | 'spiritual'
export type CompletionMethod = 'manual' | 'photo_proof' | 'location_proof' | 'partner_confirm' | 'ai_detect'
export type CelebrationType = 'standard' | 'milestone' | 'breakthrough' | 'legendary'
export type BrainState = 'alpha' | 'beta' | 'theta' | 'gamma'
export type NeurochemicalTarget = 'dopamine' | 'oxytocin' | 'serotonin' | 'endorphins'

export interface NeuroscienceAction {
  id: string
  baseAction: string
  hypnoticVariation: string
  nlpEmbeddedVersion: string
  primaryLoveLanguage: string
  neurosciencePrinciple: string
  embeddedSuggestions: string[]
  presuppositions: string[]
  identityShiftTarget: string
  futurePacingElement: string
  positiveAssumption: string
  neurochemicalTarget: NeurochemicalTarget
  neuralPathway: string
  optimalBrainState: BrainState
  durationMinutes: number
}

export interface MicroActionCompletion {
  id: string
  userId: string
  actionText: string
  actionCategory: ActionCategory
  completedAt: Date
  emotionalStateBefore?: string
  emotionalStateAfter?: string
  confidenceLevel?: number
  relationshipImpactRating?: number
  hypnoticAffirmation?: string
  nlpPatternUsed?: string
  subconsciousTrigger?: string
  experiencePoints: number
  celebrationType: CelebrationType
  neuralStrength: number
  habitFormationScore: number
}

export interface SubconsciousProgrammingSession {
  id: string
  sessionType: 'post_action' | 'daily_reinforcement' | 'breakthrough_moment' | 'habit_installation'
  programmingContent: string
  primaryTechnique: string
  hypnoticElements: string[]
  brainStateInduced: BrainState
  sessionDurationSeconds: number
  userReceptivityScore?: number
}

/**
 * Neuroscience-based micro-action system with subconscious programming
 */
export class NeuroscienceMicroActionService {
  private supabase: Awaited<ReturnType<typeof createServerClient>>

  private async getSupabaseClient() {
    if (!this.supabase) {
      this.supabase = await createServerClient()
    }
    return this.supabase
  }

  /**
   * Get a personalized micro-action using neuroscience principles
   */
  async getPersonalizedAction(
    userId: string,
    loveLanguage?: string,
    attachmentStyle?: string,
    timeOfDay?: string
  ): Promise<NeuroscienceAction | null> {
    try {
      const supabase = await this.getSupabaseClient()

      // Get user's neural pathway strengths
      const neuralStrengths = await this.getNeuralPathwayStrengths(userId)
      
      // Find the weakest pathway to strengthen (neuroplasticity principle)
      const targetCategory = this.getOptimalTargetCategory(neuralStrengths, loveLanguage)
      
      // Get appropriate action from neuroscience library
      let query = supabase
        .from('neuroscience_action_library')
        .select('*')
        .eq('is_active', true)

      if (loveLanguage) {
        query = query.eq('primary_love_language', loveLanguage)
      }

      if (attachmentStyle) {
        query = query.or(`attachment_style_focus.eq.${attachmentStyle},attachment_style_focus.eq.all`)
      }

      if (timeOfDay) {
        query = query.eq('circadian_optimization', timeOfDay)
      }

      const { data: actions, error } = await query.limit(5)

      if (error || !actions || actions.length === 0) {
        return null
      }

      // Select action using weighted random based on completion rates and neural needs
      const selectedAction = this.selectOptimalAction(actions, neuralStrengths)

      return {
        id: selectedAction.id,
        baseAction: selectedAction.base_action,
        hypnoticVariation: selectedAction.hypnotic_variation,
        nlpEmbeddedVersion: selectedAction.nlp_embedded_version,
        primaryLoveLanguage: selectedAction.primary_love_language,
        neurosciencePrinciple: selectedAction.neuroscience_principle,
        embeddedSuggestions: selectedAction.embedded_suggestions || [],
        presuppositions: selectedAction.presuppositions || [],
        identityShiftTarget: selectedAction.identity_shift_target,
        futurePacingElement: selectedAction.future_pacing_element,
        positiveAssumption: selectedAction.positive_assumption,
        neurochemicalTarget: selectedAction.neurochemical_target as NeurochemicalTarget,
        neuralPathway: selectedAction.neural_pathway,
        optimalBrainState: selectedAction.optimal_brain_state as BrainState,
        durationMinutes: selectedAction.duration_minutes || 2
      }

    } catch (error) {
      console.error('Error getting personalized action:', error)
      return null
    }
  }

  /**
   * Complete a micro-action with full neuroscience tracking and hypnotic reinforcement
   */
  async completeAction({
    userId,
    actionId,
    actionText,
    actionCategory,
    completionMethod = 'manual',
    emotionalStateBefore,
    emotionalStateAfter,
    confidenceLevel,
    relationshipImpactRating,
    proofData
  }: {
    userId: string
    actionId: string
    actionText: string
    actionCategory: ActionCategory
    completionMethod?: CompletionMethod
    emotionalStateBefore?: string
    emotionalStateAfter?: string
    confidenceLevel?: number
    relationshipImpactRating?: number
    proofData?: any
  }): Promise<{
    success: boolean
    completion?: MicroActionCompletion
    programmingSession?: SubconsciousProgrammingSession
    celebration?: any
    error?: string
  }> {
    try {
      const supabase = await this.getSupabaseClient()

      // Calculate experience points based on difficulty and impact
      const experiencePoints = this.calculateExperiencePoints(
        actionCategory,
        confidenceLevel || 5,
        relationshipImpactRating || 5
      )

      // Determine celebration type based on streaks and achievements
      const celebrationType = await this.determineCelebrationType(userId, actionCategory)

      // Calculate current neural strength for this category
      const { data: neuralStrengthData } = await supabase
        .rpc('calculate_neural_strength', {
          target_user_id: userId,
          action_category: actionCategory
        })

      const neuralStrength = neuralStrengthData || 1.0

      // Calculate habit formation progress (using spaced repetition principles)
      const habitFormationScore = await this.calculateHabitFormationScore(userId, actionCategory)

      // Generate personalized hypnotic affirmation
      const { data: affirmationData } = await supabase
        .rpc('generate_hypnotic_affirmation', {
          target_user_id: userId,
          action_completed: actionText,
          partner_name: 'your partner' // TODO: Get actual partner name
        })

      const hypnoticAffirmation = affirmationData || 'You are naturally becoming more loving and connected each day.'

      // Create completion record
      const { data: completion, error: completionError } = await supabase
        .from('micro_action_completions')
        .insert({
          user_id: userId,
          action_text: actionText,
          action_category: actionCategory,
          completion_method: completionMethod,
          proof_data: proofData,
          emotional_state_before: emotionalStateBefore,
          emotional_state_after: emotionalStateAfter,
          confidence_level: confidenceLevel,
          relationship_impact_rating: relationshipImpactRating,
          hypnotic_affirmation: hypnoticAffirmation,
          nlp_pattern_used: this.selectNLPPattern(emotionalStateBefore, emotionalStateAfter),
          subconscious_trigger: this.generateSubconsciousTrigger(actionCategory),
          experience_points: experiencePoints,
          celebration_type: celebrationType,
          neural_strength: neuralStrength,
          habit_formation_score: habitFormationScore,
          completion_context: {
            time_of_day: new Date().getHours(),
            day_of_week: new Date().getDay(),
            completion_method: completionMethod
          }
        })
        .select()
        .single()

      if (completionError) {
        return { success: false, error: 'Failed to record completion' }
      }

      // Create subconscious programming session
      const programmingSession = await this.createProgrammingSession({
        userId,
        actionCompletionId: completion.id,
        actionCategory,
        emotionalTransition: { before: emotionalStateBefore, after: emotionalStateAfter },
        confidenceLevel: confidenceLevel || 5
      })

      // Update user's streak and achievements
      try {
        const { getStreakManager } = await import('./streaks')
        const streakManager = getStreakManager()
        await streakManager.recordDailyRitual(userId, 'micro_action_completed')

        const { achievementManager } = await import('./achievements')
        await achievementManager.evaluateUserAchievements(userId)
      } catch (error) {
        console.error('Error updating streaks/achievements:', error)
      }

      // Track analytics with neuroscience data
      trackEvent('neuroscience_micro_action_completed', {
        user_id: userId,
        action_id: actionId,
        action_category: actionCategory,
        experience_points: experiencePoints,
        celebration_type: celebrationType,
        neural_strength: neuralStrength,
        habit_formation_score: habitFormationScore,
        emotional_improvement: this.calculateEmotionalImprovement(emotionalStateBefore, emotionalStateAfter),
        confidence_level: confidenceLevel,
        relationship_impact: relationshipImpactRating
      })

      return {
        success: true,
        completion: {
          id: completion.id,
          userId: completion.user_id,
          actionText: completion.action_text,
          actionCategory: completion.action_category as ActionCategory,
          completedAt: new Date(completion.completed_at),
          emotionalStateBefore: completion.emotional_state_before,
          emotionalStateAfter: completion.emotional_state_after,
          confidenceLevel: completion.confidence_level,
          relationshipImpactRating: completion.relationship_impact_rating,
          hypnoticAffirmation: completion.hypnotic_affirmation,
          nlpPatternUsed: completion.nlp_pattern_used,
          subconsciousTrigger: completion.subconscious_trigger,
          experiencePoints: completion.experience_points,
          celebrationType: completion.celebration_type as CelebrationType,
          neuralStrength: parseFloat(completion.neural_strength),
          habitFormationScore: parseFloat(completion.habit_formation_score)
        },
        programmingSession
      }

    } catch (error) {
      console.error('Error completing micro-action:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Create a subconscious programming session using hypnotic techniques
   */
  private async createProgrammingSession({
    userId,
    actionCompletionId,
    actionCategory,
    emotionalTransition,
    confidenceLevel
  }: {
    userId: string
    actionCompletionId: string
    actionCategory: ActionCategory
    emotionalTransition: { before?: string; after?: string }
    confidenceLevel: number
  }): Promise<SubconsciousProgrammingSession | null> {
    try {
      const supabase = await this.getSupabaseClient()

      // Generate hypnotic programming content
      const programmingContent = this.generateHypnoticProgrammingContent({
        actionCategory,
        emotionalTransition,
        confidenceLevel
      })

      // Select optimal NLP technique based on user state
      const primaryTechnique = this.selectOptimalNLPTechnique(emotionalTransition, confidenceLevel)

      // Create programming session
      const { data: session, error } = await supabase
        .from('subconscious_programming_sessions')
        .insert({
          user_id: userId,
          session_type: 'post_action',
          programming_content: programmingContent,
          primary_technique: primaryTechnique,
          hypnotic_elements: this.getHypnoticElements(primaryTechnique),
          brain_state_induced: 'alpha', // Optimal for suggestion acceptance
          session_duration_seconds: 180, // 3 minutes
          triggered_by_action_id: actionCompletionId,
          optimal_timing_achieved: true
        })
        .select()
        .single()

      if (error || !session) {
        return null
      }

      return {
        id: session.id,
        sessionType: session.session_type,
        programmingContent: session.programming_content,
        primaryTechnique: session.primary_technique,
        hypnoticElements: session.hypnotic_elements || [],
        brainStateInduced: session.brain_state_induced as BrainState,
        sessionDurationSeconds: session.session_duration_seconds,
        userReceptivityScore: session.user_receptivity_score
      }

    } catch (error) {
      console.error('Error creating programming session:', error)
      return null
    }
  }

  /**
   * Generate hypnotic programming content with embedded NLP patterns
   */
  private generateHypnoticProgrammingContent({
    actionCategory,
    emotionalTransition,
    confidenceLevel
  }: {
    actionCategory: ActionCategory
    emotionalTransition: { before?: string; after?: string }
    confidenceLevel: number
  }): string {
    const templates = {
      touch: `As you continue to naturally express love through touch, you're discovering that each loving gesture automatically deepens your connection. Your body already knows how to create these beautiful moments, and with each touch, you're literally rewiring your brain for deeper intimacy. Notice how easy it becomes to reach for your partner with love.`,
      
      words: `You are naturally becoming someone who sees and speaks the beauty in your partner. Each word of appreciation you share is creating new neural pathways of love and positivity. As you continue to express these loving thoughts, you'll find that your mind automatically focuses on what you love about your partner, and the words flow more easily each time.`,
      
      acts: `You're naturally developing the wonderful habit of noticing what would help your partner and taking loving action. Each act of service feels more rewarding because you're releasing dopamine and oxytocin - the chemicals of love and connection. As this pattern strengthens, you'll find yourself automatically looking for ways to serve with love.`,
      
      time: `You are becoming someone who naturally creates sacred spaces of attention with your partner. Each moment of presence you share is strengthening your neural pathways of connection and mindfulness. As you continue to give this gift of presence, you'll discover that being fully present becomes as natural as breathing.`,
      
      gifts: `You're naturally developing the beautiful ability to express love through thoughtful gifts and gestures. Each gift you give or receive creates a positive reinforcement loop in your brain, strengthening the neural pathways of generosity and appreciation. This loving pattern will continue to grow stronger and more automatic.`,
      
      physical: `Your body is naturally learning new ways to express and receive love. Each physical expression of care is creating stronger neural connections between movement and love. As these pathways strengthen, you'll find yourself naturally moving in ways that create more connection and intimacy with your partner.`,
      
      emotional: `You are naturally becoming more emotionally intelligent and connected. Each emotional interaction is strengthening your brain's capacity for empathy, understanding, and love. As these neural networks grow stronger, emotional connection becomes more natural and automatic in your relationship.`,
      
      spiritual: `You're naturally deepening the spiritual connection in your relationship. Each moment of spiritual sharing creates neural pathways that connect love, meaning, and transcendence. As this spiritual dimension strengthens, you'll find that your relationship naturally becomes a source of deeper meaning and connection.`
    }

    let content = templates[actionCategory] || templates.emotional

    // Add confidence-based reinforcement
    if (confidenceLevel >= 8) {
      content += ` The confidence you felt completing this action is evidence that these loving patterns are already becoming natural parts of who you are.`
    } else if (confidenceLevel <= 4) {
      content += ` Even small steps like this are creating lasting changes in your brain. Trust that each loving action, no matter how small, is building stronger neural pathways of connection.`
    }

    // Add emotional transition reinforcement
    if (emotionalTransition.before && emotionalTransition.after) {
      content += ` Notice how your emotional state naturally shifted from ${emotionalTransition.before} to ${emotionalTransition.after}. This is your brain learning that loving actions create positive emotions, strengthening your motivation to love.`
    }

    return content
  }

  /**
   * Select optimal NLP technique based on user's emotional state and confidence
   */
  private selectOptimalNLPTechnique(
    emotionalTransition: { before?: string; after?: string },
    confidenceLevel: number
  ): string {
    // High confidence - use anchoring to lock in the positive state
    if (confidenceLevel >= 8) {
      return 'anchoring'
    }

    // Low confidence - use reframing to shift perspective
    if (confidenceLevel <= 4) {
      return 'reframing'
    }

    // Positive emotional shift - use future pacing
    if (emotionalTransition.before && emotionalTransition.after) {
      const beforeValence = this.getEmotionalValence(emotionalTransition.before)
      const afterValence = this.getEmotionalValence(emotionalTransition.after)
      
      if (afterValence > beforeValence) {
        return 'future_pacing'
      }
    }

    // Default to parts integration for balanced states
    return 'parts_integration'
  }

  /**
   * Get hypnotic elements based on NLP technique
   */
  private getHypnoticElements(technique: string): string[] {
    const elements = {
      anchoring: [
        'kinesthetic_anchor',
        'positive_state_association',
        'sensory_stacking',
        'automatic_trigger_installation'
      ],
      reframing: [
        'perspective_shift',
        'meaning_recontextualization',
        'positive_reinterpretation',
        'empowering_belief_installation'
      ],
      future_pacing: [
        'timeline_projection',
        'success_visualization',
        'automatic_behavior_installation',
        'positive_expectation_programming'
      ],
      parts_integration: [
        'internal_conflict_resolution',
        'wholeness_suggestion',
        'unified_intention_alignment',
        'integrated_behavior_pattern'
      ]
    }

    return elements[technique as keyof typeof elements] || elements.anchoring
  }

  /**
   * Calculate experience points using gamification psychology
   */
  private calculateExperiencePoints(
    category: ActionCategory,
    confidence: number,
    impact: number
  ): number {
    const basePoints = 100
    const difficultyMultiplier = this.getDifficultyMultiplier(category)
    const confidenceBonus = (confidence - 5) * 10 // -40 to +50 points
    const impactBonus = (impact - 5) * 15 // -60 to +75 points
    
    return Math.max(50, Math.round(basePoints * difficultyMultiplier + confidenceBonus + impactBonus))
  }

  /**
   * Get difficulty multiplier for different action categories
   */
  private getDifficultyMultiplier(category: ActionCategory): number {
    const multipliers = {
      touch: 1.0,      // Physical touch is natural
      words: 1.2,      // Requires thought and articulation
      acts: 1.3,       // Requires action and effort
      time: 1.1,       // Requires presence and attention
      gifts: 1.4,      // Requires planning and resources
      physical: 1.5,   // May require overcoming physical barriers
      emotional: 1.6,  // Requires emotional intelligence
      spiritual: 1.7   // Requires deeper connection and vulnerability
    }
    
    return multipliers[category] || 1.0
  }

  /**
   * Helper methods for emotional analysis
   */
  private getEmotionalValence(emotion: string): number {
    const valences: { [key: string]: number } = {
      // Positive emotions
      'joy': 8, 'love': 9, 'gratitude': 8, 'excitement': 7, 'contentment': 6,
      'happiness': 7, 'peace': 6, 'confidence': 7, 'enthusiasm': 7,
      
      // Neutral emotions  
      'calm': 5, 'focused': 5, 'curious': 5, 'thoughtful': 5,
      
      // Negative emotions
      'sadness': 2, 'anger': 1, 'fear': 2, 'anxiety': 3, 'frustration': 3,
      'disappointment': 3, 'loneliness': 2, 'stress': 3
    }
    
    return valences[emotion.toLowerCase()] || 5
  }

  private calculateEmotionalImprovement(before?: string, after?: string): number {
    if (!before || !after) return 0
    
    const beforeValence = this.getEmotionalValence(before)
    const afterValence = this.getEmotionalValence(after)
    
    return afterValence - beforeValence
  }

  private selectNLPPattern(before?: string, after?: string): string {
    const improvement = this.calculateEmotionalImprovement(before, after)
    
    if (improvement >= 3) return 'anchoring'
    if (improvement >= 1) return 'future_pacing'
    if (improvement <= -1) return 'reframing'
    
    return 'reinforcement'
  }

  private generateSubconsciousTrigger(category: ActionCategory): string {
    const triggers = {
      touch: 'When you see your partner, you naturally feel drawn to express love through touch',
      words: 'Positive words about your partner flow easily and naturally from your heart',
      acts: 'You automatically notice opportunities to serve your partner with love',
      time: 'Giving your full presence feels natural and rewarding',
      gifts: 'You naturally think of thoughtful ways to express your love',
      physical: 'Your body naturally moves in ways that create connection',
      emotional: 'You naturally attune to your partner\'s emotional needs',
      spiritual: 'You naturally seek deeper spiritual connection with your partner'
    }
    
    return triggers[category] || 'You naturally express love in meaningful ways'
  }

  /**
   * Get user's neural pathway strengths across categories
   */
  private async getNeuralPathwayStrengths(userId: string): Promise<Record<ActionCategory, number>> {
    try {
      const supabase = await this.getSupabaseClient()
      
      const categories: ActionCategory[] = ['touch', 'words', 'acts', 'time', 'gifts', 'physical', 'emotional', 'spiritual']
      const strengths: Record<ActionCategory, number> = {} as any
      
      for (const category of categories) {
        const { data } = await supabase
          .rpc('calculate_neural_strength', {
            target_user_id: userId,
            action_category: category
          })
        
        strengths[category] = parseFloat(data || '1.0')
      }
      
      return strengths
    } catch (error) {
      console.error('Error getting neural pathway strengths:', error)
      // Return default strengths
      return {
        touch: 1.0, words: 1.0, acts: 1.0, time: 1.0,
        gifts: 1.0, physical: 1.0, emotional: 1.0, spiritual: 1.0
      }
    }
  }

  private getOptimalTargetCategory(
    strengths: Record<ActionCategory, number>,
    preferredLoveLanguage?: string
  ): ActionCategory {
    // Find the weakest category to strengthen (neuroplasticity principle)
    let weakestCategory: ActionCategory = 'words'
    let lowestStrength = 10
    
    Object.entries(strengths).forEach(([category, strength]) => {
      if (strength < lowestStrength) {
        lowestStrength = strength
        weakestCategory = category as ActionCategory
      }
    })
    
    // If user has a preferred love language, bias toward that if it's also weak
    if (preferredLoveLanguage) {
      const loveLanguageMap: { [key: string]: ActionCategory } = {
        'words': 'words',
        'acts': 'acts', 
        'time': 'time',
        'touch': 'touch',
        'gifts': 'gifts'
      }
      
      const preferredCategory = loveLanguageMap[preferredLoveLanguage]
      if (preferredCategory && strengths[preferredCategory] < 5) {
        return preferredCategory
      }
    }
    
    return weakestCategory
  }

  private selectOptimalAction(actions: any[], strengths: Record<ActionCategory, number>): any {
    // Weight actions by inverse of neural strength (weaker pathways get priority)
    // and by completion rate (proven effectiveness)
    
    const weightedActions = actions.map(action => {
      const categoryStrength = strengths[action.primary_love_language as ActionCategory] || 1
      const strengthWeight = 1 / Math.max(categoryStrength, 0.1) // Inverse strength
      const effectivenessWeight = parseFloat(action.completion_rate || '0.5')
      
      return {
        action,
        weight: strengthWeight * 0.7 + effectivenessWeight * 0.3
      }
    })
    
    // Sort by weight and return top action
    weightedActions.sort((a, b) => b.weight - a.weight)
    return weightedActions[0].action
  }

  private async calculateHabitFormationScore(userId: string, category: ActionCategory): Promise<number> {
    try {
      const supabase = await this.getSupabaseClient()
      
      // Get completion count and consistency over last 21 days (habit formation period)
      const { data: completions } = await supabase
        .from('micro_action_completions')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('action_category', category)
        .gte('completed_at', new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString())
      
      if (!completions || completions.length === 0) return 0
      
      // Calculate consistency score based on distribution across days
      const daysCovered = new Set(
        completions.map(c => new Date(c.completed_at).toDateString())
      ).size
      
      const consistencyScore = Math.min(daysCovered / 21, 1.0)
      
      // Factor in total completions (more completions = stronger habit)
      const volumeScore = Math.min(completions.length / 21, 1.0)
      
      return Math.round((consistencyScore * 0.6 + volumeScore * 0.4) * 100) / 100
    } catch (error) {
      console.error('Error calculating habit formation score:', error)
      return 0
    }
  }

  private async determineCelebrationType(userId: string, category: ActionCategory): Promise<CelebrationType> {
    try {
      const supabase = await this.getSupabaseClient()
      
      // Check for various milestone conditions
      const { data: completions } = await supabase
        .from('micro_action_completions')
        .select('id, completed_at')
        .eq('user_id', userId)
        .eq('action_category', category)
        .order('completed_at', { ascending: false })
        .limit(50)
      
      if (!completions) return 'standard'
      
      const totalCount = completions.length
      
      // Legendary - 50+ completions in category
      if (totalCount >= 50) return 'legendary'
      
      // Breakthrough - first completion in category
      if (totalCount === 1) return 'breakthrough'
      
      // Milestone - significant numbers
      if ([5, 10, 25].includes(totalCount)) return 'milestone'
      
      return 'standard'
    } catch (error) {
      console.error('Error determining celebration type:', error)
      return 'standard'
    }
  }
}

// Singleton instance
let neuroscienceService: NeuroscienceMicroActionService | null = null

export function getNeuroscienceMicroActionService(): NeuroscienceMicroActionService {
  if (!neuroscienceService) {
    neuroscienceService = new NeuroscienceMicroActionService()
  }
  return neuroscienceService
}