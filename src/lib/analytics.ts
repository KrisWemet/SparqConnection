// lib/analytics.ts
import posthog from 'posthog-js'

export const initAnalytics = () => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug()
      }
    })
  }
}

export const trackEvent = (name: string, properties?: Record<string, string | number | boolean | null>) => {
  if (typeof window !== 'undefined') {
    posthog.capture(name, properties)
  }
}

export const identifyUser = (userId: string, traits?: Record<string, string | number | boolean | null>) => {
  if (typeof window !== 'undefined') {
    posthog.identify(userId, traits)
  }
}

export const resetUser = () => {
  if (typeof window !== 'undefined') {
    posthog.reset()
  }
}