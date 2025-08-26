/**
 * Client-side Emotion-Aware Notification Service
 * Revolutionary push notifications with emotional intelligence
 */

export type NotificationType = 'ritual_reminder' | 'appreciation_prompt' | 'connection_nudge' | 'milestone_celebration' | 'crisis_intervention' | 'growth_encouragement' | 'partner_activity' | 'custom'
export type EmotionalState = 'joy' | 'love' | 'stress' | 'sadness' | 'anger' | 'anxiety' | 'excitement' | 'contentment' | 'overwhelmed' | 'neutral' | 'distance' | 'frustrated' | 'peaceful' | 'grateful' | 'reflective'
export type DetectionMethod = 'self_reported' | 'ai_inferred' | 'behavior_pattern' | 'partner_reported' | 'app_interaction'

export interface EmotionalContext {
  primaryEmotion: EmotionalState
  emotionIntensity: number // 1-5
  secondaryEmotions?: EmotionalState[]
  stressLevel: number // 1-5
  energyLevel: number // 1-5
  relationshipRelated: boolean
  trigger?: string
  confidenceScore: number // 0.0-1.0
}

export interface EmotionalNotification {
  id: string
  userId: string
  notificationType: NotificationType
  title: string
  message: string
  
  // Emotional intelligence
  targetEmotionalState?: EmotionalState
  detectedUserMood?: EmotionalState
  emotionalContext: EmotionalContext
  empathyLevel: number // 1-5
  
  // Psychological elements
  psychologicalTrigger: string
  nlpPatterns: any
  cognitiveLoad: number // 1-5
  
  // Relationship context
  relationshipStage: string
  relationshipHealthScore: number
  
  // Timing
  optimalSendTime: Date
  circadianOptimization: boolean
  relationshipTimingScore: number
  
  // Delivery tracking
  oneSignalNotificationId?: string
  deliveryStatus: string
  sentAt?: Date
  openedAt?: Date
  clickedAt?: Date
  
  // Analytics
  engagementScore?: number
  emotionalResponse?: EmotionalState
  followThroughAction: boolean
  relationshipImpactRating?: number
  effectivenessScore?: number
  
  createdAt: Date
}

export interface CrisisDetection {
  id: string
  pairId: string
  crisisType: string
  severityLevel: number // 1-5
  confidenceScore: number
  detectionSignals: any
  interventionTriggered: boolean
  crisisResolved: boolean
}

/**
 * Client-side emotion-aware notification service
 */
export class ClientEmotionAwareNotificationService {
  /**
   * Generate emotionally intelligent notification
   */
  async generateEmotionalNotification({
    notificationType,
    emotionalContext,
    customContext,
    sendImmediately = false
  }: {
    notificationType: NotificationType
    emotionalContext?: EmotionalContext
    customContext?: any
    sendImmediately?: boolean
  }): Promise<{
    success: boolean
    notification?: EmotionalNotification
    sent?: boolean
    oneSignalId?: string
    error?: string
  }> {
    try {
      const response = await fetch('/api/notifications/emotional', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificationType,
          emotionalContext,
          customContext,
          sendImmediately
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate emotional notification')
      }

      const result = await response.json()
      
      if (result.success && result.notification) {
        return {
          success: true,
          notification: this.transformNotification(result.notification),
          sent: result.sent,
          oneSignalId: result.oneSignalId,
          error: result.sendError
        }
      } else {
        return { success: false, error: result.error || 'Unknown error' }
      }
    } catch (error) {
      console.error('Error generating emotional notification:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Record user's emotional state
   */
  async recordEmotionalState({
    primaryEmotion,
    emotionIntensity,
    secondaryEmotions,
    stressLevel,
    energyLevel,
    relationshipRelated = false,
    trigger,
    confidenceScore = 1.0,
    detectionMethod = 'self_reported' as DetectionMethod
  }: {
    primaryEmotion: EmotionalState
    emotionIntensity: number
    secondaryEmotions?: EmotionalState[]
    stressLevel?: number
    energyLevel?: number
    relationshipRelated?: boolean
    trigger?: string
    confidenceScore?: number
    detectionMethod?: DetectionMethod
  }): Promise<{
    success: boolean
    emotionalContext?: EmotionalContext
    error?: string
  }> {
    try {
      const response = await fetch('/api/notifications/emotional-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          primaryEmotion,
          emotionIntensity,
          secondaryEmotions,
          stressLevel,
          energyLevel,
          relationshipRelated,
          trigger,
          confidenceScore,
          detectionMethod
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record emotional state')
      }

      const result = await response.json()
      return {
        success: result.success,
        emotionalContext: result.emotionalContext,
        error: result.error
      }
    } catch (error) {
      console.error('Error recording emotional state:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Detect current emotional state using AI
   */
  async detectEmotionalState(): Promise<{
    success: boolean
    emotionalState?: EmotionalContext
    error?: string
  }> {
    try {
      const response = await fetch('/api/notifications/emotional-state', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to detect emotional state')
      }

      const result = await response.json()
      return {
        success: result.success,
        emotionalState: result.emotionalState,
        error: result.error
      }
    } catch (error) {
      console.error('Error detecting emotional state:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Get user's emotion-aware notifications
   */
  async getEmotionalNotifications(filters?: {
    type?: NotificationType
    status?: string
    limit?: number
  }): Promise<{
    success: boolean
    notifications?: EmotionalNotification[]
    count?: number
    error?: string
  }> {
    try {
      const searchParams = new URLSearchParams()
      
      if (filters?.type) searchParams.set('type', filters.type)
      if (filters?.status) searchParams.set('status', filters.status)
      if (filters?.limit) searchParams.set('limit', filters.limit.toString())

      const response = await fetch(`/api/notifications/emotional?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch emotional notifications')
      }

      const result = await response.json()
      return {
        success: result.success,
        notifications: result.notifications?.map(this.transformNotification),
        count: result.count,
        error: result.error
      }
    } catch (error) {
      console.error('Error fetching emotional notifications:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Trigger crisis detection and intervention
   */
  async triggerCrisisDetection(): Promise<{
    success: boolean
    crisisDetected: boolean
    crisis?: CrisisDetection
    error?: string
  }> {
    try {
      const response = await fetch('/api/notifications/crisis-detection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to trigger crisis detection')
      }

      const result = await response.json()
      return {
        success: result.success,
        crisisDetected: result.crisisDetected,
        crisis: result.crisis ? this.transformCrisis(result.crisis) : undefined,
        error: result.error
      }
    } catch (error) {
      console.error('Error triggering crisis detection:', error)
      return { success: false, crisisDetected: false, error: 'Network error' }
    }
  }

  /**
   * Get crisis detection history
   */
  async getCrisisHistory(): Promise<{
    success: boolean
    crises?: CrisisDetection[]
    count?: number
    error?: string
  }> {
    try {
      const response = await fetch('/api/notifications/crisis-detection', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch crisis history')
      }

      const result = await response.json()
      return {
        success: result.success,
        crises: result.crises?.map(this.transformCrisis),
        count: result.count,
        error: result.error
      }
    } catch (error) {
      console.error('Error fetching crisis history:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Quick emotional check-in
   */
  async quickEmotionalCheckIn(emotion: EmotionalState, intensity: number): Promise<{
    success: boolean
    suggestedNotifications?: string[]
    error?: string
  }> {
    const result = await this.recordEmotionalState({
      primaryEmotion: emotion,
      emotionIntensity: intensity,
      relationshipRelated: true,
      detectionMethod: 'self_reported'
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Generate appropriate notifications based on emotional state
    const notifications = []
    
    if (['stress', 'overwhelmed', 'anxiety'].includes(emotion)) {
      notifications.push('connection_nudge', 'crisis_intervention')
    } else if (['joy', 'love', 'excitement'].includes(emotion)) {
      notifications.push('milestone_celebration', 'appreciation_prompt')
    } else if (['sadness', 'distance', 'frustrated'].includes(emotion)) {
      notifications.push('growth_encouragement', 'connection_nudge')
    }

    return {
      success: true,
      suggestedNotifications: notifications
    }
  }

  private transformNotification(notificationData: any): EmotionalNotification {
    return {
      ...notificationData,
      optimalSendTime: new Date(notificationData.optimalSendTime),
      sentAt: notificationData.sentAt ? new Date(notificationData.sentAt) : undefined,
      openedAt: notificationData.openedAt ? new Date(notificationData.openedAt) : undefined,
      clickedAt: notificationData.clickedAt ? new Date(notificationData.clickedAt) : undefined,
      createdAt: new Date(notificationData.createdAt)
    }
  }

  private transformCrisis(crisisData: any): CrisisDetection {
    return {
      id: crisisData.id,
      pairId: crisisData.pair_id || crisisData.pairId,
      crisisType: crisisData.crisis_type || crisisData.crisisType,
      severityLevel: crisisData.severity_level || crisisData.severityLevel,
      confidenceScore: crisisData.confidence_score || crisisData.confidenceScore,
      detectionSignals: crisisData.detection_signals || crisisData.detectionSignals,
      interventionTriggered: crisisData.intervention_triggered || crisisData.interventionTriggered,
      crisisResolved: crisisData.crisis_resolved || crisisData.crisisResolved
    }
  }
}

// Singleton instance
let clientEmotionService: ClientEmotionAwareNotificationService | null = null

export function getClientEmotionAwareNotificationService(): ClientEmotionAwareNotificationService {
  if (!clientEmotionService) {
    clientEmotionService = new ClientEmotionAwareNotificationService()
  }
  return clientEmotionService
}