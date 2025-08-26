/**
 * AI-Powered Plans & Planner Service with Predictive Scheduling
 * Revolutionary relationship planning with machine learning optimization
 */

import { createServerClient } from '@/lib/supabase-server'
import { trackEvent } from './analytics'

export type PlanType = 'date_night' | 'deep_conversation' | 'adventure' | 'intimacy_building' | 'conflict_resolution' | 'growth_activity' | 'celebration' | 'surprise' | 'custom'
export type PlanCategory = 'bonding' | 'communication' | 'adventure' | 'intimacy' | 'personal_growth' | 'fun' | 'conflict_healing' | 'celebration'
export type PlanStatus = 'planned' | 'scheduled' | 'reminded' | 'in_progress' | 'completed' | 'postponed' | 'cancelled'
export type LocationType = 'home' | 'outdoor' | 'restaurant' | 'activity_venue' | 'virtual' | 'anywhere'
export type PartnerApprovalStatus = 'pending' | 'approved' | 'suggested_changes' | 'declined'

export interface RelationshipPlan {
  id: string
  pairId: string
  title: string
  description?: string
  planType: PlanType
  category: PlanCategory
  
  // AI optimization data
  aiConfidenceScore: number
  optimalTimingPrediction: OptimalTiming
  personalizationFactors: PersonalizationFactors
  
  // Predictive analytics
  predictedSuccessRate: number
  predictedSatisfactionScore: number
  predictedRelationshipImpact: number
  energyLevelRequirement: number
  emotionalComplexity: number
  
  // Scheduling
  scheduledDate?: Date
  durationMinutes: number
  locationType: LocationType
  locationDetails?: string
  preparationTimeMinutes: number
  
  // Status and execution
  status: PlanStatus
  completionRating?: number
  actualSatisfactionScore?: number
  executionNotes?: string
  
  // Partner collaboration
  createdByUser: string
  partnerApprovalStatus: PartnerApprovalStatus
  partnerInputRequested: boolean
  collaborativeScore: number
  
  // Learning data
  aiPredictionAccuracy?: number
  planEffectivenessScore?: number
  adaptationSuggestions?: any
  
  createdAt: Date
  updatedAt: Date
}

export interface AIPlanTemplate {
  id: string
  templateName: string
  templateDescription: string
  planType: PlanType
  category: PlanCategory
  
  titleTemplate: string
  descriptionTemplate: string
  activitySequence: PlanActivity[]
  preparationChecklist: string[]
  conversationStarters: string[]
  
  baseSuccessRate: number
  personalizationAlgorithm: PersonalizationAlgorithm
  successPatterns: SuccessPattern
  optimizationRules: OptimizationRules
  
  usageCount: number
  isActive: boolean
  createdAt: Date
}

export interface PlanActivity {
  activity: string
  duration: number
  description: string
  requirements?: string[]
  tips?: string[]
}

export interface OptimalTiming {
  recommendedDates: Array<{
    date: string
    confidence: number
    reasoning: string
    optimalTimes: Array<{
      time: string
      confidence: number
      reason: string
    }>
  }>
  energyPredictions: {
    userAEnergy: number
    userBEnergy: number
  }
  availabilityConfidence: number
}

export interface PersonalizationFactors {
  loveLanguages: string[]
  attachmentStyles: string[]
  personalityTypes: string[]
  pastPreferences: any
  recentPatterns: any
  stressLevels: any
  relationshipStage: string
}

export interface PersonalizationAlgorithm {
  personalizationFactors: string[]
  timingOptimization: string
  durationFlexibility: boolean
  customizationRules: any
}

export interface SuccessPattern {
  highSatisfactionIndicators: string[]
  optimalConditions: string[]
  commonPitfalls?: string[]
}

export interface OptimizationRules {
  optimalTiming: string
  energyRequirement: string
  emotionalPreparation: string
  contextualFactors?: any
}

export interface UserSchedulingPreferences {
  userId: string
  preferredDaysOfWeek: number[]
  preferredTimeRanges: any
  blackoutPeriods: any
  energyPatterns: any
  
  activityPreferences: any
  locationPreferences: any
  spontaneityScore: number
  planningHorizonPreference: number
  
  aiOptimizationLevel: 'minimal' | 'balanced' | 'aggressive' | 'experimental'
  allowAISurprises: boolean
  requirePartnerApproval: boolean
  notificationPreferences: any
}

export interface PlanSuggestion {
  templateId: string
  title: string
  description: string
  category: PlanCategory
  planType: PlanType
  predictedSuccessRate: number
  estimatedDuration: number
  personalizedTitle: string
  personalizedDescription: string
  reasoning: string
  confidenceScore: number
}

/**
 * AI-powered relationship planning service
 */
export class AIPlannerService {
  private supabase: Awaited<ReturnType<typeof createServerClient>>

  private async getSupabaseClient() {
    if (!this.supabase) {
      this.supabase = await createServerClient()
    }
    return this.supabase
  }

  /**
   * Generate AI-powered plan suggestions based on user patterns and preferences
   */
  async generatePlanSuggestions(
    pairId: string,
    preferences?: {
      category?: PlanCategory
      targetDate?: Date
      durationPreference?: number
      energyLevel?: number
      moodContext?: string
    }
  ): Promise<PlanSuggestion[]> {
    try {
      const supabase = await this.getSupabaseClient()

      // Use the database function for AI suggestions
      const { data: suggestions, error } = await supabase
        .rpc('generate_ai_plan_suggestions', {
          target_pair_id: pairId,
          plan_category: preferences?.category,
          target_date: preferences?.targetDate?.toISOString().split('T')[0],
          duration_preference: preferences?.durationPreference || 60
        })

      if (error) {
        console.error('Error generating plan suggestions:', error)
        return []
      }

      // Enhanced AI processing would happen here in production
      const enhancedSuggestions = suggestions.map((suggestion: any) => ({
        ...suggestion,
        reasoning: this.generateReasoningText(suggestion, preferences),
        confidenceScore: this.calculateConfidenceScore(suggestion, preferences),
        personalizedDescription: this.personalizeDescription(suggestion, preferences)
      }))

      trackEvent('ai_plan_suggestions_generated', {
        pair_id: pairId,
        suggestions_count: enhancedSuggestions.length,
        category_filter: preferences?.category,
        duration_preference: preferences?.durationPreference
      })

      return enhancedSuggestions
    } catch (error) {
      console.error('Error generating plan suggestions:', error)
      return []
    }
  }

  /**
   * Calculate optimal scheduling times using predictive analytics
   */
  async calculateOptimalTiming(
    pairId: string,
    planDurationMinutes: number = 60,
    dateRange?: { start: Date; end: Date }
  ): Promise<OptimalTiming | null> {
    try {
      const supabase = await this.getSupabaseClient()

      const dateRangeString = dateRange 
        ? `[${dateRange.start.toISOString().split('T')[0]}, ${dateRange.end.toISOString().split('T')[0]})`
        : null

      const { data: optimalTimes, error } = await supabase
        .rpc('calculate_optimal_schedule_time', {
          target_pair_id: pairId,
          plan_duration_minutes: planDurationMinutes,
          target_date_range: dateRangeString
        })

      if (error) {
        console.error('Error calculating optimal timing:', error)
        return null
      }

      return this.processOptimalTimingData(optimalTimes)
    } catch (error) {
      console.error('Error calculating optimal timing:', error)
      return null
    }
  }

  /**
   * Create a new relationship plan with AI optimization
   */
  async createPlan(planData: {
    pairId: string
    templateId?: string
    title: string
    description?: string
    planType: PlanType
    category: PlanCategory
    scheduledDate?: Date
    durationMinutes?: number
    locationType?: LocationType
    locationDetails?: string
    customizations?: any
  }): Promise<RelationshipPlan | null> {
    try {
      const supabase = await this.getSupabaseClient()

      // Get AI optimizations
      const optimalTiming = await this.calculateOptimalTiming(
        planData.pairId,
        planData.durationMinutes || 60
      )

      const personalizationFactors = await this.getPersonalizationFactors(planData.pairId)
      const predictiveScores = await this.calculatePredictiveScores(planData, personalizationFactors)

      const { data: plan, error } = await supabase
        .from('relationship_plans')
        .insert({
          pair_id: planData.pairId,
          title: planData.title,
          description: planData.description,
          plan_type: planData.planType,
          category: planData.category,
          scheduled_date: planData.scheduledDate?.toISOString(),
          duration_minutes: planData.durationMinutes || 60,
          location_type: planData.locationType || 'anywhere',
          location_details: planData.locationDetails,
          
          // AI optimization data
          ai_confidence_score: predictiveScores.confidenceScore,
          optimal_timing_prediction: optimalTiming,
          personalization_factors: personalizationFactors,
          
          // Predictions
          predicted_success_rate: predictiveScores.successRate,
          predicted_satisfaction_score: predictiveScores.satisfactionScore,
          predicted_relationship_impact: predictiveScores.relationshipImpact,
          energy_level_requirement: predictiveScores.energyRequirement,
          emotional_complexity: predictiveScores.emotionalComplexity,
          
          // Default values
          preparation_time_minutes: 15,
          status: planData.scheduledDate ? 'scheduled' : 'planned',
          created_by_user: (await supabase.auth.getUser()).data.user?.id,
          partner_approval_status: 'pending',
          partner_input_requested: false,
          collaborative_score: 0.5
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating plan:', error)
        return null
      }

      trackEvent('ai_relationship_plan_created', {
        plan_id: plan.id,
        pair_id: planData.pairId,
        plan_type: planData.planType,
        category: planData.category,
        predicted_success_rate: predictiveScores.successRate,
        ai_confidence: predictiveScores.confidenceScore
      })

      return this.transformDatabasePlan(plan)
    } catch (error) {
      console.error('Error creating plan:', error)
      return null
    }
  }

  /**
   * Update plan execution results for AI learning
   */
  async recordPlanExecution(
    planId: string,
    executionData: {
      completionRating: number
      actualSatisfactionScore: number
      userASatisfaction: number
      userBSatisfaction: number
      userAEnergyLevel: number
      userBEnergyLevel: number
      userAMoodBefore?: string
      userAMoodAfter?: string
      userBMoodBefore?: string
      userBMoodAfter?: string
      whatWorkedWell?: string[]
      whatCouldImprove?: string[]
      wouldDoAgainRating: number
      executionNotes?: string
    }
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabaseClient()

      // Update the plan
      const { error: planError } = await supabase
        .from('relationship_plans')
        .update({
          status: 'completed',
          completion_rating: executionData.completionRating,
          actual_satisfaction_score: executionData.actualSatisfactionScore,
          execution_notes: executionData.executionNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', planId)

      if (planError) {
        console.error('Error updating plan:', planError)
        return false
      }

      // Record detailed analytics
      const { error: analyticsError } = await supabase
        .from('plan_execution_analytics')
        .insert({
          plan_id: planId,
          start_time: new Date().toISOString(), // Simplified - in production track actual start
          end_time: new Date().toISOString(),
          completion_percentage: 1.0,
          user_a_satisfaction: executionData.userASatisfaction,
          user_b_satisfaction: executionData.userBSatisfaction,
          user_a_energy_level: executionData.userAEnergyLevel,
          user_b_energy_level: executionData.userBEnergyLevel,
          user_a_mood_before: executionData.userAMoodBefore,
          user_a_mood_after: executionData.userAMoodAfter,
          user_b_mood_before: executionData.userBMoodBefore,
          user_b_mood_after: executionData.userBMoodAfter,
          what_worked_well: executionData.whatWorkedWell,
          what_could_improve: executionData.whatCouldImprove,
          would_do_again_rating: executionData.wouldDoAgainRating,
          preparation_quality: 4 // Default - in production, collect this
        })

      if (analyticsError) {
        console.error('Error recording analytics:', analyticsError)
      }

      trackEvent('ai_plan_execution_recorded', {
        plan_id: planId,
        completion_rating: executionData.completionRating,
        satisfaction_score: executionData.actualSatisfactionScore,
        would_do_again: executionData.wouldDoAgainRating
      })

      return true
    } catch (error) {
      console.error('Error recording plan execution:', error)
      return false
    }
  }

  /**
   * Get user's plans with AI insights
   */
  async getUserPlans(
    pairId: string,
    filters?: {
      status?: PlanStatus
      category?: PlanCategory
      dateRange?: { start: Date; end: Date }
    }
  ): Promise<RelationshipPlan[]> {
    try {
      const supabase = await this.getSupabaseClient()

      let query = supabase
        .from('relationship_plans')
        .select('*')
        .eq('pair_id', pairId)
        .order('scheduled_date', { ascending: true, nullsFirst: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }

      if (filters?.dateRange) {
        query = query
          .gte('scheduled_date', filters.dateRange.start.toISOString())
          .lte('scheduled_date', filters.dateRange.end.toISOString())
      }

      const { data: plans, error } = await query

      if (error) {
        console.error('Error fetching plans:', error)
        return []
      }

      return plans?.map(this.transformDatabasePlan) || []
    } catch (error) {
      console.error('Error getting user plans:', error)
      return []
    }
  }

  /**
   * Update user scheduling preferences for AI optimization
   */
  async updateSchedulingPreferences(
    userId: string,
    preferences: Partial<UserSchedulingPreferences>
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabaseClient()

      const { error } = await supabase
        .from('user_scheduling_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error updating scheduling preferences:', error)
        return false
      }

      trackEvent('scheduling_preferences_updated', {
        user_id: userId,
        ai_optimization_level: preferences.aiOptimizationLevel,
        spontaneity_score: preferences.spontaneityScore
      })

      return true
    } catch (error) {
      console.error('Error updating scheduling preferences:', error)
      return false
    }
  }

  private generateReasoningText(suggestion: any, preferences: any): string {
    const reasons = []
    
    if (suggestion.predicted_success_rate > 0.8) {
      reasons.push('high success rate based on similar couples')
    }
    
    if (preferences?.category && suggestion.category === preferences.category) {
      reasons.push('matches your preferred activity type')
    }
    
    if (preferences?.energyLevel && preferences.energyLevel <= 3 && suggestion.category === 'relaxation') {
      reasons.push('perfect for your current energy level')
    }
    
    return reasons.length > 0 
      ? `Recommended because it has a ${reasons.join(', ')}.`
      : 'AI-selected based on relationship patterns and preferences.'
  }

  private calculateConfidenceScore(suggestion: any, preferences: any): number {
    let score = suggestion.predicted_success_rate || 0.5
    
    if (preferences?.category === suggestion.category) score += 0.1
    if (preferences?.durationPreference && Math.abs(preferences.durationPreference - suggestion.estimated_duration) < 30) score += 0.05
    
    return Math.min(score, 1.0)
  }

  private personalizeDescription(suggestion: any, preferences: any): string {
    let description = suggestion.description || ''
    
    if (preferences?.moodContext === 'stressed') {
      description += ' This activity is particularly good for relaxation and stress relief.'
    }
    
    if (preferences?.energyLevel && preferences.energyLevel <= 2) {
      description += ' Perfect for low-energy days when you want to connect without high intensity.'
    }
    
    return description
  }

  private processOptimalTimingData(rawData: any): OptimalTiming {
    // Process the raw timing data from the database function
    return {
      recommendedDates: rawData || [],
      energyPredictions: {
        userAEnergy: 3.5, // Default - would use ML model in production
        userBEnergy: 3.5
      },
      availabilityConfidence: 0.80
    }
  }

  private async getPersonalizationFactors(pairId: string): Promise<PersonalizationFactors> {
    // In production, this would gather extensive data about the couple
    return {
      loveLanguages: ['words', 'time'],
      attachmentStyles: ['secure', 'secure'],
      personalityTypes: ['unknown'],
      pastPreferences: {},
      recentPatterns: {},
      stressLevels: {},
      relationshipStage: 'established'
    }
  }

  private async calculatePredictiveScores(
    planData: any, 
    personalizationFactors: PersonalizationFactors
  ): Promise<{
    confidenceScore: number
    successRate: number
    satisfactionScore: number
    relationshipImpact: number
    energyRequirement: number
    emotionalComplexity: number
  }> {
    // Simplified prediction logic - in production, use ML models
    const baseSuccessRate = 0.75
    const categoryMultipliers = {
      'bonding': 0.85,
      'communication': 0.80,
      'adventure': 0.78,
      'intimacy': 0.82,
      'personal_growth': 0.76,
      'fun': 0.88,
      'conflict_healing': 0.70,
      'celebration': 0.90
    }
    
    const successRate = baseSuccessRate * (categoryMultipliers[planData.category] || 0.75)
    
    return {
      confidenceScore: 0.78,
      successRate,
      satisfactionScore: successRate * 0.9,
      relationshipImpact: successRate * 0.85,
      energyRequirement: planData.planType === 'adventure' ? 4 : 2,
      emotionalComplexity: planData.planType === 'deep_conversation' ? 4 : 2
    }
  }

  private transformDatabasePlan(dbPlan: any): RelationshipPlan {
    return {
      id: dbPlan.id,
      pairId: dbPlan.pair_id,
      title: dbPlan.title,
      description: dbPlan.description,
      planType: dbPlan.plan_type,
      category: dbPlan.category,
      
      aiConfidenceScore: parseFloat(dbPlan.ai_confidence_score || 0),
      optimalTimingPrediction: dbPlan.optimal_timing_prediction || {},
      personalizationFactors: dbPlan.personalization_factors || {},
      
      predictedSuccessRate: parseFloat(dbPlan.predicted_success_rate || 0),
      predictedSatisfactionScore: parseFloat(dbPlan.predicted_satisfaction_score || 0),
      predictedRelationshipImpact: parseFloat(dbPlan.predicted_relationship_impact || 0),
      energyLevelRequirement: dbPlan.energy_level_requirement || 2,
      emotionalComplexity: dbPlan.emotional_complexity || 2,
      
      scheduledDate: dbPlan.scheduled_date ? new Date(dbPlan.scheduled_date) : undefined,
      durationMinutes: dbPlan.duration_minutes,
      locationType: dbPlan.location_type,
      locationDetails: dbPlan.location_details,
      preparationTimeMinutes: dbPlan.preparation_time_minutes,
      
      status: dbPlan.status,
      completionRating: dbPlan.completion_rating,
      actualSatisfactionScore: dbPlan.actual_satisfaction_score ? parseFloat(dbPlan.actual_satisfaction_score) : undefined,
      executionNotes: dbPlan.execution_notes,
      
      createdByUser: dbPlan.created_by_user,
      partnerApprovalStatus: dbPlan.partner_approval_status,
      partnerInputRequested: dbPlan.partner_input_requested,
      collaborativeScore: parseFloat(dbPlan.collaborative_score || 0),
      
      aiPredictionAccuracy: dbPlan.ai_prediction_accuracy ? parseFloat(dbPlan.ai_prediction_accuracy) : undefined,
      planEffectivenessScore: dbPlan.plan_effectiveness_score ? parseFloat(dbPlan.plan_effectiveness_score) : undefined,
      adaptationSuggestions: dbPlan.adaptation_suggestions,
      
      createdAt: new Date(dbPlan.created_at),
      updatedAt: new Date(dbPlan.updated_at)
    }
  }
}

// Singleton instance
let plannerService: AIPlannerService | null = null

export function getAIPlannerService(): AIPlannerService {
  if (!plannerService) {
    plannerService = new AIPlannerService()
  }
  return plannerService
}