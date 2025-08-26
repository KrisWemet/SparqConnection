import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAppreciationDeliveryService, type DeliveryMethod, type EmotionalTone } from '@/lib/appreciation-delivery'
import { trackEvent } from '@/lib/analytics'

// Validation schemas
const CreateDeliverySchema = z.object({
  recipientId: z.string().uuid('Invalid recipient ID'),
  messageContent: z.string().min(1, 'Message content is required').max(1000, 'Message too long'),
  deliveryMethod: z.enum(['in_app', 'sms', 'email', 'whatsapp', 'calendar_event', 'push_notification']).default('in_app'),
  emotionalTone: z.enum(['loving', 'grateful', 'playful', 'supportive', 'proud', 'apologetic', 'encouraging']).default('loving'),
  sendImmediately: z.boolean().default(true),
  scheduledFor: z.string().datetime().optional()
})

const UpdateDeliverySchema = z.object({
  deliveryId: z.string().uuid('Invalid delivery ID'),
  action: z.enum(['viewed', 'responded']),
  responseContent: z.string().optional(),
  reactionEmoji: z.string().max(10).optional(),
  emotionalImpact: z.number().min(1).max(5).optional()
})

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
    const validation = CreateDeliverySchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const {
      recipientId,
      messageContent,
      deliveryMethod,
      emotionalTone,
      sendImmediately,
      scheduledFor
    } = validation.data

    // Verify users are in an active pair relationship
    const { data: pair, error: pairError } = await supabase
      .from('pairs')
      .select('*')
      .eq('status', 'active')
      .or(`and(user_a.eq.${user.id},user_b.eq.${recipientId}),and(user_a.eq.${recipientId},user_b.eq.${user.id})`)
      .single()

    if (pairError || !pair) {
      return NextResponse.json({ 
        error: 'You can only send appreciations to your partner' 
      }, { status: 403 })
    }

    // Create the appreciation delivery
    const deliveryService = getAppreciationDeliveryService()
    const result = await deliveryService.createAppreciation({
      senderId: user.id,
      recipientId,
      messageContent,
      deliveryMethod: deliveryMethod as DeliveryMethod,
      emotionalTone: emotionalTone as EmotionalTone,
      sendImmediately,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined
    })

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to create appreciation delivery' 
      }, { status: 500 })
    }

    // Track creation success
    trackEvent('appreciation_delivery_api_success', {
      sender_id: user.id,
      recipient_id: recipientId,
      delivery_method: deliveryMethod,
      emotional_tone: emotionalTone,
      send_immediately: sendImmediately
    })

    return NextResponse.json({
      success: true,
      message: 'Appreciation delivery created successfully',
      deliveryId: result.deliveryId,
      scheduled: !sendImmediately
    })

  } catch (error) {
    console.error('Appreciation delivery POST error:', error)
    
    trackEvent('appreciation_delivery_api_error', {
      error_message: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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
    const validation = UpdateDeliverySchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const {
      deliveryId,
      action,
      responseContent,
      reactionEmoji,
      emotionalImpact
    } = validation.data

    const deliveryService = getAppreciationDeliveryService()
    let result: boolean

    switch (action) {
      case 'viewed':
        result = await deliveryService.recordViewed(deliveryId, user.id)
        break
      
      case 'responded':
        result = await deliveryService.recordResponse(
          deliveryId,
          user.id,
          responseContent,
          reactionEmoji,
          emotionalImpact
        )
        break
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (!result) {
      return NextResponse.json({ 
        error: 'Failed to update delivery status' 
      }, { status: 500 })
    }

    // Track interaction
    trackEvent('appreciation_delivery_interaction', {
      user_id: user.id,
      delivery_id: deliveryId,
      action: action,
      has_response: !!responseContent,
      has_reaction: !!reactionEmoji,
      emotional_impact: emotionalImpact
    })

    return NextResponse.json({
      success: true,
      message: `Delivery ${action} recorded successfully`
    })

  } catch (error) {
    console.error('Appreciation delivery PUT error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'received' // 'sent' or 'received'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') // Optional status filter

    // Build query based on type
    let query = supabase
      .from('appreciation_deliveries')
      .select(`
        id,
        sender_id,
        recipient_id,
        message_content,
        delivery_method,
        emotional_tone,
        sentiment_score,
        message_category,
        status,
        scheduled_for,
        delivered_at,
        viewed_at,
        responded_at,
        response_content,
        response_reaction,
        emotional_impact_score,
        created_at,
        sender:sender_id (full_name, email),
        recipient:recipient_id (full_name, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type === 'sent') {
      query = query.eq('sender_id', user.id)
    } else {
      query = query.eq('recipient_id', user.id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: deliveries, error } = await query

    if (error) {
      console.error('Error fetching appreciation deliveries:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch deliveries' 
      }, { status: 500 })
    }

    // Get delivery insights for the user
    const deliveryService = getAppreciationDeliveryService()
    const insights = await deliveryService.getDeliveryInsights(user.id)

    trackEvent('appreciation_deliveries_fetched', {
      user_id: user.id,
      type: type,
      count: deliveries?.length || 0,
      has_insights: !!insights
    })

    return NextResponse.json({
      deliveries: deliveries || [],
      insights: insights,
      pagination: {
        limit,
        offset,
        hasMore: (deliveries?.length || 0) === limit
      }
    })

  } catch (error) {
    console.error('Appreciation delivery GET error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}