import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

// Initialize Supabase with service role key for webhook handling
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Missing Stripe signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('Stripe webhook received:', event.type)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ 
      error: 'Webhook handler failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout completed for session:', session.id)
  
  const userId = session.metadata?.user_id
  if (!userId) {
    console.error('No user_id in checkout session metadata')
    return
  }

  try {
    // Update subscription session status
    await supabase
      .from('subscription_sessions')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_session_id', session.id)

    console.log('Checkout session marked as completed')
  } catch (error) {
    console.error('Error updating checkout session:', error)
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id)
  
  const userId = subscription.metadata?.user_id
  const subscriptionTier = subscription.metadata?.subscription_tier
  
  if (!userId || !subscriptionTier) {
    console.error('Missing metadata in subscription:', subscription.metadata)
    return
  }

  try {
    // Create or update subscription record
    await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
        subscription_tier: subscriptionTier,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
        cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    // Update user's subscription status in profiles
    await supabase
      .from('profiles')
      .update({
        subscription_tier: subscriptionTier,
        subscription_status: subscription.status,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    console.log('Subscription created and user profile updated')
  } catch (error) {
    console.error('Error handling subscription creation:', error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id)
  
  const userId = subscription.metadata?.user_id
  
  if (!userId) {
    console.error('No user_id in subscription metadata')
    return
  }

  try {
    // Update subscription record
    await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
        cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)

    // Update user's subscription status in profiles
    await supabase
      .from('profiles')
      .update({
        subscription_status: subscription.status,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    console.log('Subscription updated')
  } catch (error) {
    console.error('Error handling subscription update:', error)
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  console.log('Subscription cancelled:', subscription.id)
  
  const userId = subscription.metadata?.user_id
  
  if (!userId) {
    console.error('No user_id in subscription metadata')
    return
  }

  try {
    // Update subscription record
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)

    // Update user's subscription status in profiles
    await supabase
      .from('profiles')
      .update({
        subscription_tier: 'free',
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    console.log('Subscription cancelled and user profile updated')
  } catch (error) {
    console.error('Error handling subscription cancellation:', error)
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded for invoice:', invoice.id)
  
  if (!invoice.subscription) return

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
  const userId = subscription.metadata?.user_id
  
  if (!userId) return

  try {
    // Log successful payment
    await supabase
      .from('payment_history')
      .insert({
        user_id: userId,
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: subscription.id,
        amount: invoice.total,
        currency: invoice.currency,
        status: 'succeeded',
        billing_period_start: new Date(invoice.period_start * 1000).toISOString(),
        billing_period_end: new Date(invoice.period_end * 1000).toISOString(),
        created_at: new Date().toISOString()
      })

    console.log('Payment logged successfully')
  } catch (error) {
    console.error('Error logging payment:', error)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed for invoice:', invoice.id)
  
  if (!invoice.subscription) return

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
  const userId = subscription.metadata?.user_id
  
  if (!userId) return

  try {
    // Log failed payment
    await supabase
      .from('payment_history')
      .insert({
        user_id: userId,
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: subscription.id,
        amount: invoice.total,
        currency: invoice.currency,
        status: 'failed',
        billing_period_start: new Date(invoice.period_start * 1000).toISOString(),
        billing_period_end: new Date(invoice.period_end * 1000).toISOString(),
        created_at: new Date().toISOString()
      })

    console.log('Failed payment logged')
  } catch (error) {
    console.error('Error logging failed payment:', error)
  }
}