/**
 * Emotion-Aware Notification Intelligence System
 * Revolutionary push notifications that adapt to emotional states and relationship dynamics
 */

import { createServerClient } from '@/lib/supabase-server'
import { trackEvent } from './analytics'

export type NotificationType = 'ritual_reminder' | 'appreciation_prompt' | 'connection_nudge' | 'milestone_celebration' | 'crisis_intervention' | 'growth_encouragement' | 'partner_activity' | 'custom'
export type EmotionalState = 'joy' | 'love' | 'stress' | 'sadness' | 'anger' | 'anxiety' | 'excitement' | 'contentment' | 'overwhelmed' | 'neutral' | 'distance' | 'frustrated' | 'peaceful' | 'grateful' | 'reflective'
export type EmotionalTone = 'supportive' | 'encouraging' | 'gentle' | 'playful' | 'urgent' | 'compassionate' | 'affirming' | 'celebratory'
export type PsychologyTechnique = 'reciprocity' | 'social_proof' | 'curiosity' | 'scarcity' | 'urgency' | 'momentum' | 'hope' | 'empathy'
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'dismissed' | 'failed'

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

export interface NotificationTemplate {
  id: string
  templateName: string
  notificationType: NotificationType
  baseTitle: string
  baseMessage: string
  targetEmotions: EmotionalState[]
  avoidEmotions: EmotionalState[]
  emotionalTone: EmotionalTone
  primaryPsychologyTechnique: PsychologyTechnique
  nlpElements: {
    presuppositions?: string[]
    embeddedCommands?: string[]
    empathyAnchors?: string[]
    amplificationLanguage?: string[]
    posibilityLanguage?: string[]
    normalization?: string[]
    metaphorUse?: string[]
    progressAcknowledgment?: string[]
    valueSstacking?: string[]
    futurePacing?: string[]
  }
  historicalSuccessRate: number
  isActive: boolean
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
  psychologicalTrigger: PsychologyTechnique
  nlpPatterns: any
  cognitiveLoad: number // 1-5
  
  // Relationship context
  relationshipStage: string
  coupleMoodSync?: any
  relationshipHealthScore: number
  
  // Timing
  optimalSendTime: Date
  circadianOptimization: boolean
  relationshipTimingScore: number
  
  // Personalization
  personalityAdaptation: any
  loveLanguageFocus?: string
  attachmentStyleConsideration: any
  
  // Delivery tracking
  oneSignalNotificationId?: string
  deliveryStatus: DeliveryStatus
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
  crisisType: 'communication_breakdown' | 'emotional_distance' | 'conflict_escalation' | 'intimacy_issues' | 'external_stress' | 'trust_concerns' | 'life_transition' | 'custom'
  severityLevel: number // 1-5
  confidenceScore: number
  detectionSignals: any
  interventionTriggered: boolean
  crisisResolved: boolean
}

/**
 * Emotion-aware notification service with OneSignal integration
 */
export class EmotionAwareNotificationService {
  private supabase: Awaited<ReturnType<typeof createServerClient>>

  private async getSupabaseClient() {
    if (!this.supabase) {
      this.supabase = await createServerClient()
    }
    return this.supabase
  }

  /**
   * Detect user's current emotional state using AI
   */
  async detectEmotionalState(
    userId: string,
    context?: {
      recentActivity?: any
      interactionPatterns?: any
      behavioralIndicators?: any
    }
  ): Promise<EmotionalContext | null> {
    try {
      const supabase = await this.getSupabaseClient()

      const { data: emotionalState, error } = await supabase
        .rpc('detect_user_emotional_state', {
          target_user_id: userId,
          detection_context: context || {}
        })

      if (error) {
        console.error('Error detecting emotional state:', error)
        return null
      }

      if (!emotionalState.success) {
        console.error('Failed to detect emotional state:', emotionalState.error)
        return null
      }

      const state = emotionalState.emotional_state
      return {
        primaryEmotion: state.primary_emotion as EmotionalState,
        emotionIntensity: state.intensity || 3,
        stressLevel: 3, // Default - would be inferred in production
        energyLevel: 3, // Default - would be inferred in production
        relationshipRelated: false, // Default - would be analyzed in production
        confidenceScore: state.confidence || 0.5
      }
    } catch (error) {
      console.error('Error detecting emotional state:', error)
      return null
    }
  }

  /**
   * Generate emotionally intelligent notification
   */
  async generateEmotionalNotification(
    userId: string,
    notificationType: NotificationType,
    emotionalContext?: EmotionalContext,
    customContext?: any
  ): Promise<{
    success: boolean
    notification?: EmotionalNotification
    error?: string
  }> {
    try {
      const supabase = await this.getSupabaseClient()

      // Detect emotional state if not provided
      let currentEmotionalContext = emotionalContext
      if (!currentEmotionalContext) {
        currentEmotionalContext = await this.detectEmotionalState(userId, customContext)
        if (!currentEmotionalContext) {
          return { success: false, error: 'Unable to detect emotional state' }
        }
      }

      // Generate notification using database function
      const { data: notificationData, error } = await supabase
        .rpc('generate_emotional_notification', {
          target_user_id: userId,
          notification_type: notificationType,
          emotional_context: {
            empathy_level: this.calculateEmpathyLevel(currentEmotionalContext),
            stress_level: currentEmotionalContext.stressLevel,
            relationship_related: currentEmotionalContext.relationshipRelated
          }
        })

      if (error) {
        console.error('Error generating notification:', error)
        return { success: false, error: 'Failed to generate notification' }
      }

      if (!notificationData.success) {
        return { success: false, error: notificationData.error }
      }

      // Calculate optimal send time
      const optimalSendTime = await this.calculateOptimalSendTime(
        userId,
        currentEmotionalContext,
        notificationType
      )

      // Create emotional notification record
      const { data: notification, error: insertError } = await supabase
        .from('emotion_aware_notifications')
        .insert({
          user_id: userId,
          notification_type: notificationType,
          title: notificationData.title,
          message: notificationData.message,
          target_emotional_state: this.determineTargetEmotionalState(currentEmotionalContext, notificationType),
          detected_user_mood: currentEmotionalContext.primaryEmotion,
          emotional_context: currentEmotionalContext,
          empathy_level: notificationData.empathy_level,
          psychological_trigger: notificationData.psychology_technique,
          nlp_patterns: notificationData.nlp_elements || {},
          cognitive_load: this.calculateCognitiveLoad(notificationData.message),
          relationship_stage: 'established', // Default - would be detected in production
          relationship_health_score: 0.75, // Default - would be calculated in production
          optimal_send_time: optimalSendTime.toISOString(),
          circadian_optimization: this.isCircadianOptimized(optimalSendTime),
          relationship_timing_score: 0.8, // Default - would be calculated in production
          personality_adaptation: {},
          love_language_focus: 'words', // Default - would be personalized in production
          attachment_style_consideration: {},
          delivery_status: 'pending'
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating notification record:', insertError)
        return { success: false, error: 'Failed to create notification record' }
      }

      const emotionalNotification: EmotionalNotification = {
        id: notification.id,
        userId: notification.user_id,
        notificationType: notification.notification_type,
        title: notification.title,
        message: notification.message,
        targetEmotionalState: notification.target_emotional_state as EmotionalState,
        detectedUserMood: notification.detected_user_mood as EmotionalState,
        emotionalContext: notification.emotional_context,
        empathyLevel: notification.empathy_level,
        psychologicalTrigger: notification.psychological_trigger as PsychologyTechnique,
        nlpPatterns: notification.nlp_patterns,
        cognitiveLoad: notification.cognitive_load,
        relationshipStage: notification.relationship_stage,
        coupleMoodSync: notification.couple_mood_sync,
        relationshipHealthScore: parseFloat(notification.relationship_health_score),
        optimalSendTime: new Date(notification.optimal_send_time),
        circadianOptimization: notification.circadian_optimization,
        relationshipTimingScore: parseFloat(notification.relationship_timing_score),
        personalityAdaptation: notification.personality_adaptation,
        loveLanguageFocus: notification.love_language_focus,
        attachmentStyleConsideration: notification.attachment_style_consideration,
        oneSignalNotificationId: notification.onesignal_notification_id,
        deliveryStatus: notification.delivery_status as DeliveryStatus,
        sentAt: notification.sent_at ? new Date(notification.sent_at) : undefined,
        openedAt: notification.opened_at ? new Date(notification.opened_at) : undefined,
        clickedAt: notification.clicked_at ? new Date(notification.clicked_at) : undefined,
        engagementScore: notification.engagement_score ? parseFloat(notification.engagement_score) : undefined,
        emotionalResponse: notification.emotional_response as EmotionalState,
        followThroughAction: notification.follow_through_action,
        relationshipImpactRating: notification.relationship_impact_rating ? parseFloat(notification.relationship_impact_rating) : undefined,
        effectivenessScore: notification.effectiveness_score ? parseFloat(notification.effectiveness_score) : undefined,
        createdAt: new Date(notification.created_at)
      }

      trackEvent('emotional_notification_generated', {
        user_id: userId,
        notification_type: notificationType,
        detected_emotion: currentEmotionalContext.primaryEmotion,
        empathy_level: notificationData.empathy_level,
        psychology_technique: notificationData.psychology_technique,
        emotion_intensity: currentEmotionalContext.emotionIntensity
      })

      return { success: true, notification: emotionalNotification }
    } catch (error) {
      console.error('Error generating emotional notification:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Send notification through OneSignal with emotional intelligence
   */
  async sendEmotionalNotification(
    notificationId: string,
    oneSignalPlayerId?: string
  ): Promise<{ success: boolean; oneSignalId?: string; error?: string }> {
    try {
      if (!process.env.ONE_SIGNAL_API_KEY || !process.env.NEXT_PUBLIC_ONE_SIGNAL_APP_ID) {
        console.warn('OneSignal not configured, skipping actual send')
        return { success: true, oneSignalId: 'mock-id' }
      }

      const supabase = await this.getSupabaseClient()

      // Get notification details
      const { data: notification, error: fetchError } = await supabase
        .from('emotion_aware_notifications')
        .select('*')
        .eq('id', notificationId)
        .single()

      if (fetchError || !notification) {
        return { success: false, error: 'Notification not found' }
      }

      // Prepare OneSignal payload with emotional intelligence
      const oneSignalPayload = {
        app_id: process.env.NEXT_PUBLIC_ONE_SIGNAL_APP_ID,
        headings: { en: notification.title },
        contents: { en: notification.message },
        ...(oneSignalPlayerId ? { include_player_ids: [oneSignalPlayerId] } : {}),
        // Emotional intelligence enhancements
        data: {
          notification_id: notificationId,
          emotion_context: notification.emotional_context,
          empathy_level: notification.empathy_level,
          psychology_technique: notification.psychological_trigger,
          relationship_impact: notification.relationship_health_score
        },
        // Optimize delivery timing
        send_after: notification.optimal_send_time,
        // Enhanced engagement
        buttons: this.generateEmotionalButtons(notification),
        large_icon: this.getEmotionalIcon(notification.detected_user_mood),
        small_icon: 'ic_stat_sparq_heart',
        // Personalization
        priority: this.calculateNotificationPriority(notification),
        collapse_id: `${notification.notification_type}_${notification.user_id}`
      }

      // Send through OneSignal
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${process.env.ONE_SIGNAL_API_KEY}`
        },
        body: JSON.stringify(oneSignalPayload)
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('OneSignal error:', result)
        return { success: false, error: 'Failed to send notification' }
      }

      // Update notification record
      await supabase
        .from('emotion_aware_notifications')
        .update({
          onesignal_notification_id: result.id,
          delivery_status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      trackEvent('emotional_notification_sent', {
        notification_id: notificationId,
        onesignal_id: result.id,
        emotion: notification.detected_user_mood,
        empathy_level: notification.empathy_level
      })

      return { success: true, oneSignalId: result.id }
    } catch (error) {
      console.error('Error sending emotional notification:', error)
      return { success: false, error: 'Network error' }
    }
  }

  /**
   * Record emotional state for better notification targeting
   */
  async recordEmotionalState(
    userId: string,
    emotionalState: EmotionalContext,
    detectionMethod: 'self_reported' | 'ai_inferred' | 'behavior_pattern' | 'partner_reported' | 'app_interaction' = 'self_reported'
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabaseClient()

      // Mark previous states as not current
      await supabase
        .from('user_emotional_states')
        .update({ is_current_state: false })
        .eq('user_id', userId)
        .eq('is_current_state', true)

      // Insert new emotional state
      const { error } = await supabase
        .from('user_emotional_states')
        .insert({
          user_id: userId,
          primary_emotion: emotionalState.primaryEmotion,
          emotion_intensity: emotionalState.emotionIntensity,
          secondary_emotions: emotionalState.secondaryEmotions || [],
          emotional_stability: 0.5, // Default - would be calculated based on patterns
          emotion_trigger: emotionalState.trigger,
          relationship_related: emotionalState.relationshipRelated,
          stress_level: emotionalState.stressLevel,
          energy_level: emotionalState.energyLevel,
          detection_method: detectionMethod,
          confidence_score: emotionalState.confidenceScore,
          is_current_state: true
        })

      if (error) {
        console.error('Error recording emotional state:', error)
        return false
      }

      trackEvent('emotional_state_recorded', {
        user_id: userId,
        emotion: emotionalState.primaryEmotion,
        intensity: emotionalState.emotionIntensity,
        detection_method: detectionMethod,
        relationship_related: emotionalState.relationshipRelated
      })

      return true
    } catch (error) {
      console.error('Error recording emotional state:', error)
      return false
    }
  }

  /**
   * Detect relationship crisis and trigger intervention
   */
  async detectAndInterveneCrisis(pairId: string): Promise<CrisisDetection | null> {
    try {
      const supabase = await this.getSupabaseClient()

      // This would use ML models in production to analyze patterns
      // For now, we'll use simplified logic
      
      // Check for concerning patterns (simplified)
      const { data: recentActivity } = await supabase
        .from('user_emotional_states')
        .select('*')
        .in('user_id', [
          // Would get user IDs from pair in production
        ])
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      // Simplified crisis detection logic
      const concerningEmotions = ['anger', 'sadness', 'distance', 'frustrated']
      const crisisIndicators = recentActivity?.filter(state => 
        concerningEmotions.includes(state.primary_emotion) && state.relationship_related
      ) || []

      if (crisisIndicators.length >= 3) {
        // Create crisis detection record
        const { data: crisis, error } = await supabase
          .from('relationship_crisis_detection')
          .insert({
            pair_id: pairId,
            crisis_type: 'emotional_distance',
            severity_level: Math.min(Math.ceil(crisisIndicators.length / 2), 5),
            confidence_score: 0.7,
            detection_signals: { indicators: crisisIndicators },
            behavioral_patterns: { recent_negative_emotions: crisisIndicators.length },
            intervention_triggered: true,
            intervention_type: 'gentle_guidance'
          })
          .select()
          .single()

        if (!error && crisis) {
          // Trigger gentle intervention notifications
          // Would send to both partners in production
          
          trackEvent('relationship_crisis_detected', {
            pair_id: pairId,
            crisis_type: 'emotional_distance',
            severity: crisis.severity_level,
            confidence: crisis.confidence_score
          })

          return {
            id: crisis.id,
            pairId: crisis.pair_id,
            crisisType: crisis.crisis_type,
            severityLevel: crisis.severity_level,
            confidenceScore: parseFloat(crisis.confidence_score),
            detectionSignals: crisis.detection_signals,
            interventionTriggered: crisis.intervention_triggered,
            crisisResolved: crisis.crisis_resolved
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error detecting relationship crisis:', error)
      return null
    }
  }

  private calculateEmpathyLevel(emotionalContext: EmotionalContext): number {
    // Higher empathy for negative emotions and high stress
    if (['sadness', 'anger', 'anxiety', 'overwhelmed'].includes(emotionalContext.primaryEmotion)) {
      return Math.min(5, 3 + emotionalContext.stressLevel - 2)
    }
    if (['stress', 'frustrated', 'distance'].includes(emotionalContext.primaryEmotion)) {
      return 4
    }
    return 3 // Default empathy level
  }

  private determineTargetEmotionalState(
    currentContext: EmotionalContext,
    notificationType: NotificationType
  ): EmotionalState {
    // Map negative emotions to positive targets
    const emotionTargets: Record<EmotionalState, EmotionalState> = {
      'stress': 'peaceful',
      'anxiety': 'contentment',
      'sadness': 'love',
      'anger': 'understanding',
      'frustrated': 'peaceful',
      'distance': 'love',
      'overwhelmed': 'contentment',
      'neutral': 'joy',
      'joy': 'joy',
      'love': 'love',
      'excitement': 'excitement',
      'contentment': 'contentment',
      'peaceful': 'peaceful',
      'grateful': 'grateful',
      'reflective': 'reflective'
    }

    return emotionTargets[currentContext.primaryEmotion] || 'contentment'
  }

  private async calculateOptimalSendTime(
    userId: string,
    emotionalContext: EmotionalContext,
    notificationType: NotificationType
  ): Promise<Date> {
    // Simplified optimal timing calculation
    // In production, this would use ML models and user behavior patterns
    
    const now = new Date()
    let optimalTime = new Date(now.getTime() + 15 * 60 * 1000) // Default: 15 minutes from now

    // Adjust based on notification type
    if (notificationType === 'crisis_intervention') {
      optimalTime = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes for crisis
    } else if (notificationType === 'ritual_reminder') {
      // Schedule for evening
      optimalTime.setHours(19, 0, 0, 0)
      if (optimalTime <= now) {
        optimalTime.setDate(optimalTime.getDate() + 1)
      }
    }

    return optimalTime
  }

  private calculateCognitiveLoad(message: string): number {
    // Simplified cognitive load calculation based on message complexity
    const wordCount = message.split(' ').length
    if (wordCount <= 10) return 1
    if (wordCount <= 20) return 2
    if (wordCount <= 30) return 3
    if (wordCount <= 40) return 4
    return 5
  }

  private isCircadianOptimized(sendTime: Date): boolean {
    const hour = sendTime.getHours()
    // Avoid late night and very early morning
    return hour >= 7 && hour <= 22
  }

  private generateEmotionalButtons(notification: any): any[] {
    // Generate contextual action buttons based on emotional state
    const buttons = []
    
    if (notification.notification_type === 'connection_nudge') {
      buttons.push({
        id: 'connect_now',
        text: '💕 Connect Now',
        icon: 'ic_menu_heart'
      })
    }
    
    if (notification.notification_type === 'appreciation_prompt') {
      buttons.push({
        id: 'share_appreciation',
        text: '✨ Share Love',
        icon: 'ic_menu_star'
      })
    }

    return buttons
  }

  private getEmotionalIcon(emotion?: EmotionalState): string {
    const iconMap: Record<EmotionalState, string> = {
      'joy': 'ic_large_joy',
      'love': 'ic_large_heart',
      'stress': 'ic_large_support',
      'sadness': 'ic_large_comfort',
      'anger': 'ic_large_peace',
      'anxiety': 'ic_large_calm',
      'excitement': 'ic_large_celebration',
      'contentment': 'ic_large_peaceful',
      'overwhelmed': 'ic_large_support',
      'neutral': 'ic_large_sparq',
      'distance': 'ic_large_bridge',
      'frustrated': 'ic_large_understanding',
      'peaceful': 'ic_large_zen',
      'grateful': 'ic_large_gratitude',
      'reflective': 'ic_large_thoughtful'
    }
    
    return iconMap[emotion || 'neutral'] || 'ic_large_sparq'
  }

  private calculateNotificationPriority(notification: any): number {
    // Higher priority for crisis interventions and strong emotional states
    if (notification.notification_type === 'crisis_intervention') return 10
    if (notification.empathy_level >= 4) return 8
    if (notification.notification_type === 'milestone_celebration') return 7
    return 6 // Default priority
  }
}

// Singleton instance
let emotionAwareNotificationService: EmotionAwareNotificationService | null = null

export function getEmotionAwareNotificationService(): EmotionAwareNotificationService {
  if (!emotionAwareNotificationService) {
    emotionAwareNotificationService = new EmotionAwareNotificationService()
  }
  return emotionAwareNotificationService
}