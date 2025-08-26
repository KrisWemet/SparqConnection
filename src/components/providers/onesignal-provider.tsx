'use client'

import { useEffect } from 'react'
import { notifications } from '@/lib/notifications'
import { trackEvent } from '@/lib/analytics'

export default function OneSignalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function initializeNotifications() {
      try {
        const initialized = await notifications.initialize()
        console.log('OneSignal initialized:', initialized)
        
        // Track initialization result
        trackEvent('notifications_initialized', {
          success: initialized,
          provider: 'onesignal'
        })
        
        if (initialized) {
          // Set up user identification and tags when user is logged in
          // This will be enhanced when we add user authentication context
          const subscribed = await notifications.isSubscribed()
          console.log('User subscription status:', subscribed)
          
          // Track subscription status
          trackEvent('notifications_subscription_status', {
            subscribed: subscribed,
            provider: 'onesignal'
          })
        }
      } catch (error) {
        console.error('OneSignal initialization error:', error)
        
        // Track initialization error
        trackEvent('notifications_init_error', {
          error_message: error instanceof Error ? error.message : 'Unknown error',
          provider: 'onesignal'
        })
      }
    }

    // Only initialize on client-side
    if (typeof window !== 'undefined') {
      initializeNotifications()
    }
  }, [])

  return <>{children}</>
}