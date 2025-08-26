/**
 * Next-Generation Appreciation Delivery System
 * Multi-modal delivery with emotional intelligence and AI optimization
 */

import { createClient as createServerClient } from '@/lib/supabase-server'
import { EmailService } from './email'
import { trackEvent } from './analytics'

export type DeliveryMethod = 'in_app' | 'sms' | 'email' | 'whatsapp' | 'calendar_event' | 'push_notification'
export type EmotionalTone = 'loving' | 'grateful' | 'playful' | 'supportive' | 'proud' | 'apologetic' | 'encouraging'
export type DeliveryStatus = 'pending' | 'scheduled' | 'sending' | 'delivered' | 'failed' | 'cancelled'

export interface AppreciationDelivery {
  id: string
  senderId: string
  recipientId: string
  messageContent: string
  deliveryMethod: DeliveryMethod
  emotionalTone?: EmotionalTone
  scheduledFor?: Date
  status: DeliveryStatus
  viewedAt?: Date
  respondedAt?: Date
  emotionalImpactScore?: number
}

export interface DeliveryChannel {
  channelType: DeliveryMethod
  isEnabled: boolean
  isVerified: boolean
  contactInfo?: string
  settings?: Record<string, any>
}

export interface DeliveryInsights {
  optimalDeliveryHours: number[]
  avgResponseTimeMinutes?: number
  preferredMessageLength?: number
  mostEffectiveEmotionalTone?: EmotionalTone
  channelEffectiveness: Record<DeliveryMethod, number>
  channelPreferenceOrder: DeliveryMethod[]
}

/**
 * Main appreciation delivery service
 */
export class AppreciationDeliveryService {
  private supabase: Awaited<ReturnType<typeof createServerClient>>
  private emailService: EmailService

  constructor() {
    this.emailService = new EmailService()
  }

  private async getSupabaseClient() {
    if (!this.supabase) {
      this.supabase = await createServerClient()
    }
    return this.supabase
  }

  /**
   * Create and schedule an appreciation delivery
   */
  async createAppreciation({
    senderId,
    recipientId,
    messageContent,
    deliveryMethod = 'in_app',
    emotionalTone = 'loving',
    sendImmediately = true,
    scheduledFor
  }: {
    senderId: string
    recipientId: string
    messageContent: string
    deliveryMethod?: DeliveryMethod
    emotionalTone?: EmotionalTone
    sendImmediately?: boolean
    scheduledFor?: Date
  }): Promise<{ success: boolean; deliveryId?: string; error?: string }> {
    try {
      const supabase = await this.getSupabaseClient()

      // Verify the users are in an active pair
      const { data: pair, error: pairError } = await supabase
        .from('pairs')
        .select('*')
        .eq('status', 'active')
        .or(`and(user_a.eq.${senderId},user_b.eq.${recipientId}),and(user_a.eq.${recipientId},user_b.eq.${senderId})`)
        .single()

      if (pairError || !pair) {
        return { success: false, error: 'Users are not in an active relationship' }
      }

      // Analyze the message content
      const sentimentScore = this.analyzeSentiment(messageContent)
      const category = this.categorizeMessage(messageContent, emotionalTone)

      // Get recipient's optimal delivery time if not sending immediately
      let optimalDeliveryTime = scheduledFor
      if (!sendImmediately && !scheduledFor) {
        optimalDeliveryTime = await this.getOptimalDeliveryTime(recipientId)
      }

      // Create the delivery record
      const { data: delivery, error: deliveryError } = await supabase
        .from('appreciation_deliveries')
        .insert({
          sender_id: senderId,
          recipient_id: recipientId,
          message_content: messageContent,
          delivery_method: deliveryMethod,
          preferred_method: deliveryMethod,
          emotional_tone: emotionalTone,
          sentiment_score: sentimentScore,
          message_category: category,
          scheduled_for: optimalDeliveryTime?.toISOString(),
          send_immediately: sendImmediately,
          status: sendImmediately ? 'pending' : 'scheduled',
          triggered_by: 'manual'
        })
        .select()
        .single()

      if (deliveryError) {
        console.error('Error creating appreciation delivery:', deliveryError)
        return { success: false, error: 'Failed to create delivery' }
      }

      // If sending immediately, process the delivery
      if (sendImmediately) {
        await this.processDelivery(delivery.id)
      }

      // Track analytics
      trackEvent('appreciation_delivery_created', {
        sender_id: senderId,
        recipient_id: recipientId,
        delivery_method: deliveryMethod,
        emotional_tone: emotionalTone,
        send_immediately: sendImmediately,
        sentiment_score: sentimentScore,
        message_category: category
      })

      return { success: true, deliveryId: delivery.id }

    } catch (error) {
      console.error('Error in createAppreciation:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Process a pending delivery
   */
  async processDelivery(deliveryId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabaseClient()

      // Get delivery details
      const { data: delivery, error: fetchError } = await supabase
        .from('appreciation_deliveries')
        .select(`
          *,
          sender:sender_id (user_id, email, full_name),
          recipient:recipient_id (user_id, email, full_name, phone, settings)
        `)
        .eq('id', deliveryId)
        .single()

      if (fetchError || !delivery) {
        console.error('Error fetching delivery:', fetchError)
        return false
      }

      // Update status to sending
      await supabase
        .from('appreciation_deliveries')
        .update({ 
          status: 'sending',
          delivery_attempts: delivery.delivery_attempts + 1,
          last_attempt_at: new Date().toISOString()
        })
        .eq('id', deliveryId)

      let deliverySuccess = false

      // Process based on delivery method
      switch (delivery.delivery_method) {
        case 'in_app':
          deliverySuccess = await this.deliverInApp(delivery)
          break
        case 'email':
          deliverySuccess = await this.deliverEmail(delivery)
          break
        case 'sms':
          deliverySuccess = await this.deliverSMS(delivery)
          break
        case 'whatsapp':
          deliverySuccess = await this.deliverWhatsApp(delivery)
          break
        case 'calendar_event':
          deliverySuccess = await this.deliverCalendarEvent(delivery)
          break
        case 'push_notification':
          deliverySuccess = await this.deliverPushNotification(delivery)
          break
        default:
          console.error('Unsupported delivery method:', delivery.delivery_method)
          deliverySuccess = false
      }

      // Update final status
      const finalStatus = deliverySuccess ? 'delivered' : 'failed'
      await supabase
        .from('appreciation_deliveries')
        .update({ 
          status: finalStatus,
          delivered_at: deliverySuccess ? new Date().toISOString() : null
        })
        .eq('id', deliveryId)

      // Track analytics
      trackEvent('appreciation_delivery_processed', {
        delivery_id: deliveryId,
        method: delivery.delivery_method,
        success: deliverySuccess,
        attempts: delivery.delivery_attempts + 1
      })

      return deliverySuccess

    } catch (error) {
      console.error('Error processing delivery:', error)
      return false
    }
  }

  /**
   * Deliver appreciation in-app (push to partner activity feed)
   */
  private async deliverInApp(delivery: any): Promise<boolean> {
    try {
      const supabase = await this.getSupabaseClient()

      // Create partner activity record
      const { error } = await supabase
        .from('partner_activity')
        .insert({
          user_id: delivery.sender_id,
          activity_type: 'appreciation_sent',
          metadata: {
            delivery_id: delivery.id,
            message_preview: delivery.message_content.slice(0, 100),
            emotional_tone: delivery.emotional_tone,
            partner_id: delivery.recipient_id
          }
        })

      return !error
    } catch (error) {
      console.error('Error delivering in-app appreciation:', error)
      return false
    }
  }

  /**
   * Deliver appreciation via email
   */
  private async deliverEmail(delivery: any): Promise<boolean> {
    try {
      if (!delivery.recipient?.email) {
        console.error('No email address for recipient')
        return false
      }

      const emailResult = await this.emailService.sendAppreciationEmail({
        to: delivery.recipient.email,
        senderName: delivery.sender.full_name || 'Your Partner',
        recipientName: delivery.recipient.full_name || 'there',
        message: delivery.message_content,
        emotionalTone: delivery.emotional_tone,
        deliveryId: delivery.id
      })

      // Store external message ID
      if (emailResult.success && emailResult.messageId) {
        const supabase = await this.getSupabaseClient()
        await supabase
          .from('appreciation_deliveries')
          .update({ external_message_id: emailResult.messageId })
          .eq('id', delivery.id)
      }

      return emailResult.success
    } catch (error) {
      console.error('Error delivering email appreciation:', error)
      return false
    }
  }

  /**
   * Deliver appreciation via SMS (requires Twilio integration)
   */
  private async deliverSMS(delivery: any): Promise<boolean> {
    try {
      // This would integrate with Twilio or similar SMS service
      // For now, return false as not implemented
      console.log('SMS delivery not yet implemented')
      return false
    } catch (error) {
      console.error('Error delivering SMS appreciation:', error)
      return false
    }
  }

  /**
   * Deliver appreciation via WhatsApp
   */
  private async deliverWhatsApp(delivery: any): Promise<boolean> {
    try {
      // This would integrate with WhatsApp Business API
      // For now, return false as not implemented
      console.log('WhatsApp delivery not yet implemented')
      return false
    } catch (error) {
      console.error('Error delivering WhatsApp appreciation:', error)
      return false
    }
  }

  /**
   * Create calendar event for in-person delivery
   */
  private async deliverCalendarEvent(delivery: any): Promise<boolean> {
    try {
      // This would integrate with Google Calendar or similar
      // For now, return false as not implemented
      console.log('Calendar event delivery not yet implemented')
      return false
    } catch (error) {
      console.error('Error creating calendar event:', error)
      return false
    }
  }

  /**
   * Deliver via push notification
   */
  private async deliverPushNotification(delivery: any): Promise<boolean> {
    try {
      // This would integrate with OneSignal
      // For now, return false as not implemented
      console.log('Push notification delivery not yet implemented')
      return false
    } catch (error) {
      console.error('Error delivering push notification:', error)
      return false
    }
  }

  /**
   * Get user's delivery insights
   */
  async getDeliveryInsights(userId: string): Promise<DeliveryInsights | null> {
    try {
      const supabase = await this.getSupabaseClient()

      const { data: insights, error } = await supabase
        .from('delivery_insights')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error || !insights) {
        return null
      }

      return {
        optimalDeliveryHours: insights.optimal_delivery_hours || [],
        avgResponseTimeMinutes: insights.avg_response_time_minutes,
        preferredMessageLength: insights.preferred_message_length,
        mostEffectiveEmotionalTone: insights.most_effective_emotional_tone,
        channelEffectiveness: insights.channel_effectiveness || {},
        channelPreferenceOrder: insights.channel_preference_order || ['in_app']
      }
    } catch (error) {
      console.error('Error getting delivery insights:', error)
      return null
    }
  }

  /**
   * Record when a user views an appreciation
   */
  async recordViewed(deliveryId: string, userId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabaseClient()

      const { error } = await supabase
        .from('appreciation_deliveries')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', deliveryId)
        .eq('recipient_id', userId)

      if (!error) {
        // Update delivery insights
        await this.updateDeliveryInsights(deliveryId, true)
      }

      return !error
    } catch (error) {
      console.error('Error recording view:', error)
      return false
    }
  }

  /**
   * Record user response to appreciation
   */
  async recordResponse(
    deliveryId: string,
    userId: string,
    responseContent?: string,
    reactionEmoji?: string,
    emotionalImpact?: number
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabaseClient()

      const updateData: any = {
        responded_at: new Date().toISOString()
      }

      if (responseContent) updateData.response_content = responseContent
      if (reactionEmoji) updateData.response_reaction = reactionEmoji
      if (emotionalImpact) updateData.emotional_impact_score = emotionalImpact

      const { error } = await supabase
        .from('appreciation_deliveries')
        .update(updateData)
        .eq('id', deliveryId)
        .eq('recipient_id', userId)

      if (!error) {
        // Update delivery insights with response data
        await this.updateDeliveryInsights(deliveryId, true, emotionalImpact)
      }

      return !error
    } catch (error) {
      console.error('Error recording response:', error)
      return false
    }
  }

  /**
   * Get optimal delivery time for a user
   */
  private async getOptimalDeliveryTime(userId: string): Promise<Date> {
    try {
      const supabase = await this.getSupabaseClient()

      const { data, error } = await supabase
        .rpc('get_optimal_delivery_time', { 
          target_user_id: userId 
        })

      if (error || !data) {
        // Fallback to 2 hours from now
        const fallback = new Date()
        fallback.setHours(fallback.getHours() + 2)
        return fallback
      }

      return new Date(data)
    } catch (error) {
      console.error('Error getting optimal delivery time:', error)
      const fallback = new Date()
      fallback.setHours(fallback.getHours() + 2)
      return fallback
    }
  }

  /**
   * Update delivery insights based on interaction
   */
  private async updateDeliveryInsights(
    deliveryId: string,
    wasViewed: boolean,
    emotionalImpact?: number
  ): Promise<void> {
    try {
      const supabase = await this.getSupabaseClient()

      // Get delivery details for insights update
      const { data: delivery } = await supabase
        .from('appreciation_deliveries')
        .select('recipient_id, delivery_method, created_at, viewed_at, responded_at')
        .eq('id', deliveryId)
        .single()

      if (!delivery) return

      let responseTimeMinutes: number | undefined
      if (delivery.responded_at && delivery.created_at) {
        const responseTime = new Date(delivery.responded_at).getTime() - new Date(delivery.created_at).getTime()
        responseTimeMinutes = Math.floor(responseTime / (1000 * 60))
      }

      await supabase
        .rpc('update_delivery_insights', {
          target_user_id: delivery.recipient_id,
          delivery_method: delivery.delivery_method,
          was_viewed: wasViewed,
          response_time_minutes: responseTimeMinutes,
          emotional_impact: emotionalImpact
        })

    } catch (error) {
      console.error('Error updating delivery insights:', error)
    }
  }

  /**
   * Analyze sentiment of message content
   */
  private analyzeSentiment(content: string): number {
    // Simple sentiment analysis - in production, could use more sophisticated NLP
    const positiveWords = ['love', 'thank', 'appreciate', 'grateful', 'amazing', 'wonderful', 'beautiful', 'proud', 'happy']
    const negativeWords = ['sorry', 'sad', 'disappointed', 'frustrated', 'angry', 'hurt']

    const words = content.toLowerCase().split(/\s+/)
    let positiveCount = 0
    let negativeCount = 0

    words.forEach(word => {
      if (positiveWords.some(pos => word.includes(pos))) positiveCount++
      if (negativeWords.some(neg => word.includes(neg))) negativeCount++
    })

    const total = positiveCount + negativeCount
    if (total === 0) return 0

    return (positiveCount - negativeCount) / total
  }

  /**
   * Categorize message based on content and tone
   */
  private categorizeMessage(content: string, tone: EmotionalTone): string {
    const contentLower = content.toLowerCase()

    // Check for specific patterns
    if (contentLower.includes('today') || contentLower.includes('this morning')) {
      return 'daily_appreciation'
    }

    if (contentLower.includes('anniversary') || contentLower.includes('birthday') || contentLower.includes('milestone')) {
      return 'milestone'
    }

    if (tone === 'apologetic') {
      return 'apology'
    }

    if (tone === 'encouraging' || tone === 'supportive') {
      return 'support'
    }

    return 'spontaneous'
  }
}

// Singleton instance
let deliveryService: AppreciationDeliveryService | null = null

export function getAppreciationDeliveryService(): AppreciationDeliveryService {
  if (!deliveryService) {
    deliveryService = new AppreciationDeliveryService()
  }
  return deliveryService
}