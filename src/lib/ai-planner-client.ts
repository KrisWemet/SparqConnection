/**
 * Client-side AI Planner Service with Predictive Scheduling
 * Interfaces with API routes for revolutionary relationship planning
 */

export type PlanType = 'date_night' | 'deep_conversation' | 'adventure' | 'intimacy_building' | 'conflict_resolution' | 'growth_activity' | 'celebration' | 'surprise' | 'custom'
export type PlanCategory = 'bonding' | 'communication' | 'adventure' | 'intimacy' | 'personal_growth' | 'fun' | 'conflict_healing' | 'celebration'
export type PlanStatus = 'planned' | 'scheduled' | 'reminded' | 'in_progress' | 'completed' | 'postponed' | 'cancelled'
export type LocationType = 'home' | 'outdoor' | 'restaurant' | 'activity_venue' | 'virtual' | 'anywhere'

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

export interface RelationshipPlan {
  id: string
  pairId: string
  title: string
  description?: string
  planType: PlanType
  category: PlanCategory
  
  // AI data
  aiConfidenceScore: number
  optimalTimingPrediction: OptimalTiming
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
  
  // Status
  status: PlanStatus
  completionRating?: number
  actualSatisfactionScore?: number
  executionNotes?: string
  
  // Collaboration
  createdByUser: string
  partnerApprovalStatus: string
  collaborativeScore: number
  
  createdAt: Date
  updatedAt: Date
}

export interface PlanExecutionData {
  completionRating: number
  actualSatisfactionScore: number
  userASatisfaction: number
  userBSatisfaction: number
  userAEnergyLevel?: number
  userBEnergyLevel?: number
  userAMoodBefore?: string
  userAMoodAfter?: string
  userBMoodBefore?: string
  userBMoodAfter?: string
  whatWorkedWell?: string[]
  whatCouldImprove?: string[]
  wouldDoAgainRating: number
  executionNotes?: string
}

/**
 * Client-side AI planner service
 */
export class ClientAIPlannerService {
  /**
   * Get AI-powered plan suggestions
   */
  async getPlanSuggestions(params?: {
    category?: PlanCategory
    targetDate?: Date
    duration?: number
    energyLevel?: number
    moodContext?: string
  }): Promise<{
    success: boolean
    suggestions?: PlanSuggestion[]
    error?: string
  }> {
    try {
      const searchParams = new URLSearchParams()
      
      if (params?.category) searchParams.set('category', params.category)
      if (params?.targetDate) searchParams.set('target_date', params.targetDate.toISOString().split('T')[0])
      if (params?.duration) searchParams.set('duration', params.duration.toString())
      if (params?.energyLevel) searchParams.set('energy_level', params.energyLevel.toString())
      if (params?.moodContext) searchParams.set('mood_context', params.moodContext)

      const response = await fetch(`/api/planner/suggestions?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch plan suggestions')
      }

      const result = await response.json()
      return {
        success: result.success,
        suggestions: result.suggestions,
        error: result.error
      }
    } catch (error) {
      console.error('Error fetching plan suggestions:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Calculate optimal timing for a plan
   */
  async getOptimalTiming(params?: {
    duration?: number
    startDate?: Date
    endDate?: Date
  }): Promise<{
    success: boolean
    optimalTiming?: OptimalTiming
    error?: string
  }> {
    try {
      const searchParams = new URLSearchParams()
      
      if (params?.duration) searchParams.set('duration', params.duration.toString())
      if (params?.startDate) searchParams.set('start_date', params.startDate.toISOString().split('T')[0])
      if (params?.endDate) searchParams.set('end_date', params.endDate.toISOString().split('T')[0])

      const response = await fetch(`/api/planner/optimal-timing?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch optimal timing')
      }

      const result = await response.json()
      return {
        success: result.success,
        optimalTiming: result.optimalTiming,
        error: result.error
      }
    } catch (error) {
      console.error('Error fetching optimal timing:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Create a new relationship plan
   */
  async createPlan(planData: {
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
  }): Promise<{
    success: boolean
    plan?: RelationshipPlan
    error?: string
  }> {
    try {
      const response = await fetch('/api/planner/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...planData,
          scheduledDate: planData.scheduledDate?.toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create plan')
      }

      const result = await response.json()
      return {
        success: result.success,
        plan: result.plan ? this.transformPlan(result.plan) : undefined,
        error: result.error
      }
    } catch (error) {
      console.error('Error creating plan:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Get user's relationship plans
   */
  async getPlans(filters?: {
    status?: PlanStatus
    category?: PlanCategory
    startDate?: Date
    endDate?: Date
  }): Promise<{
    success: boolean
    plans?: RelationshipPlan[]
    error?: string
  }> {
    try {
      const searchParams = new URLSearchParams()
      
      if (filters?.status) searchParams.set('status', filters.status)
      if (filters?.category) searchParams.set('category', filters.category)
      if (filters?.startDate) searchParams.set('start_date', filters.startDate.toISOString().split('T')[0])
      if (filters?.endDate) searchParams.set('end_date', filters.endDate.toISOString().split('T')[0])

      const response = await fetch(`/api/planner/plans?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch plans')
      }

      const result = await response.json()
      return {
        success: result.success,
        plans: result.plans?.map(this.transformPlan),
        error: result.error
      }
    } catch (error) {
      console.error('Error fetching plans:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Record plan execution results for AI learning
   */
  async recordPlanExecution(
    planId: string, 
    executionData: PlanExecutionData
  ): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const response = await fetch(`/api/planner/plans/${planId}/execution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(executionData)
      })

      if (!response.ok) {
        throw new Error('Failed to record plan execution')
      }

      const result = await response.json()
      return {
        success: result.success,
        error: result.error
      }
    } catch (error) {
      console.error('Error recording plan execution:', error)
      return { success: false, error: 'Network error' }
    }
  }

  private transformPlan(planData: any): RelationshipPlan {
    return {
      ...planData,
      scheduledDate: planData.scheduledDate ? new Date(planData.scheduledDate) : undefined,
      createdAt: new Date(planData.createdAt),
      updatedAt: new Date(planData.updatedAt)
    }
  }
}

// Singleton instance
let clientPlannerService: ClientAIPlannerService | null = null

export function getClientAIPlannerService(): ClientAIPlannerService {
  if (!clientPlannerService) {
    clientPlannerService = new ClientAIPlannerService()
  }
  return clientPlannerService
}