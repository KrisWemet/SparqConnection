import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getEmotionAwareNotificationService } from '@/lib/emotion-aware-notifications'

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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      notificationType,
      emotionalContext,
      customContext,
      sendImmediately = false
    } = body

    if (!notificationType) {
      return NextResponse.json(
        { error: 'Missing required field: notificationType' },
        { status: 400 }
      )
    }

    const notificationService = getEmotionAwareNotificationService()
    
    // Generate emotionally intelligent notification
    const result = await notificationService.generateEmotionalNotification(
      user.id,
      notificationType,
      emotionalContext,
      customContext
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate notification' },
        { status: 500 }
      )
    }

    // Send immediately if requested
    if (sendImmediately && result.notification) {
      const sendResult = await notificationService.sendEmotionalNotification(
        result.notification.id
      )
      
      return NextResponse.json({
        success: true,
        notification: result.notification,
        sent: sendResult.success,
        oneSignalId: sendResult.oneSignalId,
        sendError: sendResult.error
      })
    }

    return NextResponse.json({
      success: true,
      notification: result.notification
    })
  } catch (error) {
    console.error('Emotional notification POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const notificationType = searchParams.get('type')
    const deliveryStatus = searchParams.get('status')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50

    // Get user's emotion-aware notifications
    let query = supabase
      .from('emotion_aware_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (notificationType) {
      query = query.eq('notification_type', notificationType)
    }

    if (deliveryStatus) {
      query = query.eq('delivery_status', deliveryStatus)
    }

    const { data: notifications, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      count: notifications?.length || 0
    })
  } catch (error) {
    console.error('Emotional notification GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}