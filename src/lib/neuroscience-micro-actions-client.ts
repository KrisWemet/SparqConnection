/**
 * Client-side Neuroscience-Based Micro-Action System
 * Interfaces with API routes for hypnotic programming and NLP techniques
 */

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
  content: string
  technique: string
  brainState: BrainState
  duration: number
  visualizations?: string[]
  breathingPattern?: {
    inhale: number
    hold: number
    exhale: number
    cycles: number
  }
  suggestions?: string[]
}

/**
 * Client-side service for neuroscience-based micro-actions
 */
export class ClientNeuroscienceMicroActionService {
  /**
   * Get a personalized micro-action using neuroscience principles
   */
  async getPersonalizedAction(
    preferences?: {
      primaryLoveLanguage?: string
      attachmentStyle?: string
    }
  ): Promise<NeuroscienceAction | null> {
    try {
      const response = await fetch('/api/micro-actions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch personalized action')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching personalized action:', error)
      return null
    }
  }

  /**
   * Complete a micro-action with neuroscience tracking
   */
  async completeAction({
    actionText,
    actionCategory,
    completionMethod = 'manual',
    emotionalStateBefore,
    emotionalStateAfter,
    confidenceLevel,
    relationshipImpactRating,
    proofData
  }: {
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
    affirmation?: string
    neuralStrength?: number
    celebrationLevel?: string
    error?: string
  }> {
    try {
      const response = await fetch('/api/micro-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          actionText,
          actionCategory,
          completionMethod,
          emotionalStateBefore,
          emotionalStateAfter,
          confidenceLevel,
          relationshipImpactRating,
          proofData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to complete action')
      }

      const result = await response.json()
      
      if (result.success) {
        return {
          success: true,
          completion: result.completion,
          affirmation: result.affirmation,
          neuralStrength: result.neuralStrength,
          celebrationLevel: result.celebrationLevel
        }
      } else {
        return { success: false, error: result.error || 'Unknown error' }
      }
    } catch (error) {
      console.error('Error completing action:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Create a subconscious programming session
   */
  async createProgrammingSession({
    sessionType = 'daily_reinforcement',
    actionCompletedId,
    focusArea,
    userReceptivity = 7
  }: {
    sessionType?: 'post_action' | 'daily_reinforcement' | 'breakthrough_moment' | 'habit_installation'
    actionCompletedId?: string
    focusArea?: string
    userReceptivity?: number
  }): Promise<{
    success: boolean
    session?: SubconsciousProgrammingSession
    error?: string
  }> {
    try {
      const response = await fetch('/api/micro-actions/programming-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionType,
          actionCompletedId,
          focusArea,
          userReceptivity
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create programming session')
      }

      const result = await response.json()
      
      if (result.success) {
        return {
          success: true,
          session: result.session
        }
      } else {
        return { success: false, error: result.error || 'Unknown error' }
      }
    } catch (error) {
      console.error('Error creating programming session:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Update programming session with user feedback
   */
  async updateProgrammingSession({
    sessionId,
    userReceptivityScore,
    implementationSuccess,
    behavioralChangeObserved
  }: {
    sessionId: string
    userReceptivityScore: number
    implementationSuccess: boolean
    behavioralChangeObserved: boolean
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/micro-actions/programming-session', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          userReceptivityScore,
          implementationSuccess,
          behavioralChangeObserved
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update programming session')
      }

      const result = await response.json()
      return { success: result.success, error: result.error }
    } catch (error) {
      console.error('Error updating programming session:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Get neural pathway strengths for analytics
   */
  async getNeuralStrengths(category?: string): Promise<{
    categoryStrengths: Array<{ category: string; strength: number }>
    recentCompletions: any[]
    totalCompletions: number
    averageHabitScore: number
  } | null> {
    try {
      const url = category 
        ? `/api/micro-actions/neural-strength?category=${category}`
        : '/api/micro-actions/neural-strength'
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch neural strengths')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching neural strengths:', error)
      return null
    }
  }
}

// Singleton instance
let clientService: ClientNeuroscienceMicroActionService | null = null

export function getClientNeuroscienceMicroActionService(): ClientNeuroscienceMicroActionService {
  if (!clientService) {
    clientService = new ClientNeuroscienceMicroActionService()
  }
  return clientService
}