import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import Stripe from 'stripe'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

// Validation schema for checkout requests
const CreateCheckoutSchema = z.object({
  tier: z.enum(['premium', 'ultimate']),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional()
})

// Subscription tiers configuration
const SUBSCRIPTION_TIERS = {
  premium: {
    name: 'Premium',
    price: '$9.99/month',
    description: 'Unlock premium features and extended quest library',
    features: [
      'Full quest library access',
      'Advanced personalization',
      'Priority support',
      'Custom identities',
      'Extended play modes'
    ]
  },
  ultimate: {
    name: 'Ultimate', 
    price: '$19.99/month',
    description: 'Everything in Premium plus AI coaching and live workshops',
    features: [
      'Everything in Premium',
      'AI relationship coaching',
      'Live couples workshops',
      'Personalized insights',
      'Advanced analytics',
      'Priority customer support'
    ]
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
    const validation = CreateCheckoutSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { tier, success_url, cancel_url } = validation.data

    // Get price ID for the selected tier
    const priceId = tier === 'premium' 
      ? process.env.STRIPE_PRICE_ID_PREMIUM
      : process.env.STRIPE_PRICE_ID_ULTIMATE

    if (!priceId) {
      return NextResponse.json({ 
        error: 'Subscription tier not configured' 
      }, { status: 500 })
    }

    // Get user's profile for metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', user.id)
      .single()

    // Create or retrieve Stripe customer
    let customerId: string | null = null
    
    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (subscription?.stripe_customer_id) {
      customerId = subscription.stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: profile?.email || user.email || '',
        name: profile?.full_name || '',
        metadata: {
          user_id: user.id,
          environment: process.env.NODE_ENV || 'development'
        }
      })
      customerId = customer.id
    }

    // Determine success and cancel URLs
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const successUrl = success_url || `${baseUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = cancel_url || `${baseUrl}/billing?cancelled=true`

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        subscription_tier: tier,
        environment: process.env.NODE_ENV || 'development'
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          subscription_tier: tier
        }
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_update: {
        address: 'auto',
        name: 'auto'
      }
    })

    // Store checkout session info for webhook processing
    await supabase
      .from('subscription_sessions')
      .upsert({
        user_id: user.id,
        stripe_session_id: session.id,
        stripe_customer_id: customerId,
        subscription_tier: tier,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
      tier: tier,
      tier_info: SUBSCRIPTION_TIERS[tier]
    })

  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ 
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}