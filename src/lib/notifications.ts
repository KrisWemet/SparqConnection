// Notification helper for Sparq Connection with OneSignal integration
import OneSignal from 'react-onesignal'

export interface NotificationPayload {
  title: string
  body: string
  data?: Record<string, unknown>
}

export interface NotificationPreferences {
  ritual_reminders: boolean
  partner_activity: boolean
  play_invites: boolean
  milestone_celebrations: boolean
}

// OneSignal notification service for Sparq Connection
export class NotificationService {
  private static instance: NotificationService
  private isInitialized = false

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  async initialize(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false

      const appId = process.env.NEXT_PUBLIC_ONE_SIGNAL_APP_ID
      if (!appId) {
        console.warn('OneSignal App ID not found in environment variables')
        return false
      }

      // Initialize OneSignal
      await OneSignal.init({
        appId: appId,
        safari_web_id: 'web.onesignal.auto.web.push',
        notifyButton: {
          enable: false, // Don't show the default notify button
        },
        allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
        serviceWorkerParam: { scope: '/' },
        serviceWorkerPath: '/OneSignalSDKWorker.js'
      })

      // Check if user is subscribed and sync with backend
      const subscription = await OneSignal.getSubscription()
      const playerId = subscription?.getSubscriptionId()
      console.log('OneSignal subscription status:', playerId)

      // Sync player ID with backend if subscribed
      if (playerId) {
        await this.syncPlayerIdWithBackend(playerId)
      }

      this.isInitialized = true
      return true
    } catch (error) {
      console.error('Failed to initialize OneSignal:', error)
      return false
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isInitialized) return false
    
    try {
      // Show OneSignal subscription prompt
      await OneSignal.showSlidedownPrompt()
      const permission = await OneSignal.getNotificationPermission()
      return permission === 'granted'
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return false
    }
  }

  async getUserId(): Promise<string | null> {
    if (!this.isInitialized) return null
    
    try {
      const subscription = await OneSignal.getSubscription()
      return subscription?.getSubscriptionId() || null
    } catch (error) {
      console.error('Failed to get user ID:', error)
      return null
    }
  }

  async isSubscribed(): Promise<boolean> {
    if (!this.isInitialized) return false
    
    try {
      const subscription = await OneSignal.getSubscription()
      return subscription?.getSubscriptionId() !== null
    } catch (error) {
      console.error('Failed to check subscription status:', error)
      return false
    }
  }

  async setUserTags(tags: Record<string, string>): Promise<boolean> {
    if (!this.isInitialized) return false
    
    try {
      await OneSignal.sendTags(tags)
      return true
    } catch (error) {
      console.error('Failed to set user tags:', error)
      return false
    }
  }

  async syncPlayerIdWithBackend(playerId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          onesignal_player_id: playerId
        })
      })

      if (!response.ok) {
        console.error('Failed to sync player ID with backend:', response.status)
        return false
      }

      console.log('OneSignal player ID synced with backend')
      return true
    } catch (error) {
      console.error('Error syncing player ID with backend:', error)
      return false
    }
  }

  async updateNotificationPreferences(preferences: NotificationPreferences): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notification_preferences: preferences
        })
      })

      if (!response.ok) {
        console.error('Failed to update notification preferences:', response.status)
        return false
      }

      console.log('Notification preferences updated')
      return true
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      return false
    }
  }

  async getNotificationPreferences(): Promise<NotificationPreferences | null> {
    try {
      const response = await fetch('/api/notifications/preferences')
      
      if (!response.ok) {
        console.error('Failed to fetch notification preferences:', response.status)
        return null
      }

      const data = await response.json()
      return data.notification_preferences || null
    } catch (error) {
      console.error('Error fetching notification preferences:', error)
      return null
    }
  }

  // Client-side notifications are sent via server API
  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    if (!this.isInitialized) {
      console.log('Notifications not initialized, would send:', payload)
      return false
    }

    try {
      // For actual notification sending, we need to call server API
      // This method is mainly for logging/development purposes
      console.log('📱 Notification triggered:', payload)
      
      // In a real app, this would trigger a server-side API call:
      // await fetch('/api/notifications/send', { ... })
      
      return true
    } catch (error) {
      console.error('Failed to send notification:', error)
      return false
    }
  }

  // Notification templates following the label-only strategy (no spoilers)
  static getNotificationTemplates() {
    return {
      ritual_reminder: {
        title: '✨ Your 5-minute flow is ready',
        body: 'Take 5 minutes to connect'
      },
      partner_completed_ritual: {
        title: '💝 Your partner checked in',
        body: "They're thinking of you"
      },
      partner_note_added: {
        title: '💌 New reply from your partner',
        body: 'Something new to read'
      },
      play_invite: {
        title: '🎮 Play invitation',
        body: 'Ready to play together?'
      },
      play_turn: {
        title: '🎯 Your turn to play',
        body: 'A game is waiting for you'
      },
      connection_milestone: {
        title: '🎉 Milestone',
        body: 'Nice progress together'
      },
      streak_celebration: {
        title: '🔥 Days in a row!',
        body: 'Keep the small steps going'
      }
    }
  }

  async scheduleRitualReminder(userId: string): Promise<boolean> {
    return this.sendNotificationToUser(userId, 'ritual_reminder')
  }

  async notifyPartnerActivity(
    partnerId: string, 
    activityType: string
  ): Promise<boolean> {
    let notificationType: string

    switch (activityType) {
      case 'ritual_completed':
        notificationType = 'partner_completed_ritual'
        break
      case 'note_added':
        notificationType = 'partner_note_added'
        break
      case 'play_move':
        notificationType = 'play_turn'
        break
      default:
        return false
    }

    return this.sendNotificationToUser(partnerId, notificationType)
  }

  async notifyPlayInvite(partnerId: string, gameType: string): Promise<boolean> {
    return this.sendNotificationToUser(partnerId, 'play_invite', { game_type: gameType })
  }

  async celebrateMilestone(
    partnerId: string, 
    milestoneType: string
  ): Promise<boolean> {
    const notificationType = milestoneType === 'streak' 
      ? 'streak_celebration' 
      : 'connection_milestone'

    return this.sendNotificationToUser(partnerId, notificationType, { milestone_type: milestoneType })
  }

  private async sendNotificationToUser(
    recipientId: string, 
    notificationType: string, 
    data?: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_id: recipientId,
          notification_type: notificationType,
          data: data || {}
        })
      })

      if (!response.ok) {
        console.error('Failed to send notification:', response.status)
        return false
      }

      console.log(`📱 Notification sent: ${notificationType} to ${recipientId}`)
      return true
    } catch (error) {
      console.error('Error sending notification:', error)
      return false
    }
  }
}

// Helper to get notification service instance
export const notifications = NotificationService.getInstance()

// Initialize notifications when the module loads (client-side only)
if (typeof window !== 'undefined') {
  notifications.initialize().then(initialized => {
    console.log('Notifications initialized:', initialized)
  })
}

export default NotificationService
