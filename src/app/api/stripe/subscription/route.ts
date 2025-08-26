import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import Stripe from 'stripe'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

// Validation schema for subscription actions
const SubscriptionActionSchema = z.object({
  action: z.enum(['cancel', 'reactivate']),
  cancel_at_period_end: z.boolean().optional()
})

export async function GET(request: NextRequest) {
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

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's subscription status
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .rpc('get_user_subscription_status', { user_id: user.id })

    if (subscriptionError) {
      console.error('Error fetching subscription status:', subscriptionError)
      return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
    }

    const subscriptionStatus = subscriptionData[0] || {
      tier: 'free',
      status: 'active',
      current_period_end: null,
      is_active: true
    }

    // Get detailed subscription info from database
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select(`
        stripe_subscription_id,
        stripe_customer_id,
        subscription_tier,
        status,
        current_period_start,
        current_period_end,
        cancel_at,
        cancelled_at,
        created_at
      `)
      .eq('user_id', user.id)
      .single()

    // Get recent payment history
    const { data: paymentHistory } = await supabase
      .from('payment_history')
      .select(`
        stripe_invoice_id,
        amount,
        currency,
        status,
        billing_period_start,
        billing_period_end,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      subscription: {
        tier: subscriptionStatus.tier,
        status: subscriptionStatus.status,
        is_active: subscriptionStatus.is_active,
        current_period_end: subscriptionStatus.current_period_end,
        ...subscription
      },
      payment_history: paymentHistory || [],
      features: getFeatureAccess(subscriptionStatus.tier, subscriptionStatus.is_active)
    })

  } catch (error) {
    console.error('Subscription GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = SubscriptionActionSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { action, cancel_at_period_end = true } = validation.data

    // Get user's subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .single()

    if (subscriptionError || !subscription?.stripe_subscription_id) {
      return NextResponse.json({ 
        error: 'No active subscription found' 
      }, { status: 404 })
    }

    let result
    switch (action) {
      case 'cancel':
        result = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: cancel_at_period_end
        })
        break

      case 'reactivate':
        result = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: false
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ 
      message: `Subscription ${action}led successfully`,
      subscription: {
        id: result.id,
        status: result.status,
        cancel_at_period_end: result.cancel_at_period_end,
        current_period_end: new Date(result.current_period_end * 1000).toISOString()
      }
    })

  } catch (error) {
    console.error('Subscription action error:', error)
    return NextResponse.json({ 
      error: 'Failed to process subscription action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function getFeatureAccess(tier: string, isActive: boolean) {
  const baseFeatures = {
    daily_ritual: true,
    partner_connections: true,
    basic_play_games: true,
    basic_analytics: true
  }

  if (!isActive || tier === 'free') {
    return {
      ...baseFeatures,
      full_quest_library: false,
      advanced_personalization: false,
      custom_identities: false,
      extended_play_modes: false,
      ai_coaching: false,
      live_workshops: false,
      priority_support: false
    }
  }

  const premiumFeatures = {
    ...baseFeatures,
    full_quest_library: true,
    advanced_personalization: true,
    custom_identities: true,
    extended_play_modes: true,
    ai_coaching: false,
    live_workshops: false,
    priority_support: true
  }

  if (tier === 'ultimate') {
    return {
      ...premiumFeatures,
      ai_coaching: true,
      live_workshops: true,
      priority_support: true
    }
  }

  return premiumFeatures
}