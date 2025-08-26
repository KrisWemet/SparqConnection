// Subscription utilities for feature access control
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface SubscriptionStatus {
  tier: 'free' | 'premium' | 'ultimate'
  status: string
  isActive: boolean
  currentPeriodEnd: string | null
}

export interface FeatureAccess {
  daily_ritual: boolean
  partner_connections: boolean
  basic_play_games: boolean
  basic_analytics: boolean
  full_quest_library: boolean
  advanced_personalization: boolean
  custom_identities: boolean
  extended_play_modes: boolean
  ai_coaching: boolean
  live_workshops: boolean
  priority_support: boolean
}

// Premium features that require subscription
export const PREMIUM_FEATURES = [
  'full_quest_library',
  'advanced_personalization', 
  'custom_identities',
  'extended_play_modes',
  'priority_support'
] as const

// Ultimate features that require ultimate subscription
export const ULTIMATE_FEATURES = [
  'ai_coaching',
  'live_workshops'
] as const

export async function getUserSubscriptionStatus(userId?: string): Promise<SubscriptionStatus | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Get current user if userId not provided
    let targetUserId = userId
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      targetUserId = user.id
    }

    // Get subscription status from database function
    const { data, error } = await supabase
      .rpc('get_user_subscription_status', { user_id: targetUserId })

    if (error) {
      console.error('Error fetching subscription status:', error)
      return null
    }

    const status = data[0] || {
      tier: 'free',
      status: 'active',
      current_period_end: null,
      is_active: true
    }

    return {
      tier: status.tier as 'free' | 'premium' | 'ultimate',
      status: status.status,
      isActive: status.is_active,
      currentPeriodEnd: status.current_period_end
    }
  } catch (error) {
    console.error('Error getting user subscription status:', error)
    return null
  }
}

export function getFeatureAccess(subscriptionStatus: SubscriptionStatus | null): FeatureAccess {
  const baseFeatures: FeatureAccess = {
    daily_ritual: true,
    partner_connections: true,
    basic_play_games: true,
    basic_analytics: true,
    full_quest_library: false,
    advanced_personalization: false,
    custom_identities: false,
    extended_play_modes: false,
    ai_coaching: false,
    live_workshops: false,
    priority_support: false
  }

  if (!subscriptionStatus || !subscriptionStatus.isActive || subscriptionStatus.tier === 'free') {
    return baseFeatures
  }

  const premiumFeatures: FeatureAccess = {
    ...baseFeatures,
    full_quest_library: true,
    advanced_personalization: true,
    custom_identities: true,
    extended_play_modes: true,
    priority_support: true
  }

  if (subscriptionStatus.tier === 'ultimate') {
    return {
      ...premiumFeatures,
      ai_coaching: true,
      live_workshops: true
    }
  }

  return premiumFeatures
}

export async function hasFeatureAccess(feature: keyof FeatureAccess, userId?: string): Promise<boolean> {
  const subscriptionStatus = await getUserSubscriptionStatus(userId)
  const featureAccess = getFeatureAccess(subscriptionStatus)
  return featureAccess[feature]
}

export async function requirePremiumAccess(userId?: string): Promise<boolean> {
  const subscriptionStatus = await getUserSubscriptionStatus(userId)
  return subscriptionStatus?.isActive === true && 
         (subscriptionStatus.tier === 'premium' || subscriptionStatus.tier === 'ultimate')
}

export async function requireUltimateAccess(userId?: string): Promise<boolean> {
  const subscriptionStatus = await getUserSubscriptionStatus(userId)
  return subscriptionStatus?.isActive === true && subscriptionStatus.tier === 'ultimate'
}

// Subscription tier information for UI
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: '$0',
    description: 'Perfect for getting started with daily rituals',
    features: [
      'Daily 5-8 minute rituals',
      'Partner connections',
      'Basic play games',
      'Basic analytics'
    ],
    limitations: [
      'Limited quest library',
      'Basic personalization only',
      'Standard support'
    ]
  },
  premium: {
    name: 'Premium',
    price: '$9.99/month',
    description: 'Unlock advanced features and full quest library',
    features: [
      'Everything in Free',
      'Full quest library access',
      'Advanced AI personalization',
      'Custom identities',
      'Extended play modes',
      'Priority support'
    ],
    popular: true
  },
  ultimate: {
    name: 'Ultimate',
    price: '$19.99/month', 
    description: 'Everything in Premium plus AI coaching and workshops',
    features: [
      'Everything in Premium',
      'AI relationship coaching',
      'Live couples workshops',
      'Personalized insights',
      'Advanced analytics',
      'Priority customer support'
    ]
  }
} as const

// Error responses for subscription enforcement
export const SUBSCRIPTION_ERRORS = {
  PREMIUM_REQUIRED: {
    error: 'Premium subscription required',
    message: 'This feature requires a Premium or Ultimate subscription',
    upgrade_url: '/pricing'
  },
  ULTIMATE_REQUIRED: {
    error: 'Ultimate subscription required', 
    message: 'This feature requires an Ultimate subscription',
    upgrade_url: '/pricing'
  },
  SUBSCRIPTION_EXPIRED: {
    error: 'Subscription expired',
    message: 'Your subscription has expired. Please renew to continue',
    upgrade_url: '/billing'
  }
} as const