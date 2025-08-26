import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Validation schema for notification requests
const SendNotificationSchema = z.object({
  recipient_id: z.string().uuid('Invalid recipient ID'),
  notification_type: z.enum([
    'ritual_reminder',
    'partner_completed_ritual', 
    'partner_note_added',
    'play_invite',
    'play_turn',
    'connection_milestone',
    'streak_celebration'
  ]),
  data: z.record(z.string(), z.unknown()).optional()
})

interface OneSignalNotification {
  app_id: string
  include_subscription_ids?: string[]
  include_external_user_ids?: string[]
  headings: { en: string }
  contents: { en: string }
  data?: Record<string, unknown>
  web_url?: string
}

// Notification templates following label-only strategy (no spoilers)
const NOTIFICATION_TEMPLATES = {
  ritual_reminder: {
    title: '✨ Your 5-minute flow is ready',
    body: 'Take 5 minutes to connect',
    url: '/today'
  },
  partner_completed_ritual: {
    title: '💝 Your partner checked in', 
    body: "They're thinking of you",
    url: '/connections'
  },
  partner_note_added: {
    title: '💌 New reply from your partner',
    body: 'Something new to read', 
    url: '/connections'
  },
  play_invite: {
    title: '🎮 Play invitation',
    body: 'Ready to play together?',
    url: '/play'
  },
  play_turn: {
    title: '🎯 Your turn to play', 
    body: 'A game is waiting for you',
    url: '/play'
  },
  connection_milestone: {
    title: '🎉 Milestone',
    body: 'Nice progress together',
    url: '/connections'
  },
  streak_celebration: {
    title: '🔥 Days in a row!',
    body: 'Keep the small steps going', 
    url: '/connections'
  }
}

async function sendOneSignalNotification(notification: OneSignalNotification): Promise<boolean> {
  try {
    const apiKey = process.env.ONE_SIGNAL_API_KEY
    if (!apiKey) {
      console.error('OneSignal API key not configured')
      return false
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`
      },
      body: JSON.stringify(notification)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OneSignal API error:', response.status, errorText)
      return false
    }

    const result = await response.json()
    console.log('OneSignal notification sent:', result.id)
    return true
  } catch (error) {
    console.error('Failed to send OneSignal notification:', error)
    return false
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
    const validation = SendNotificationSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { recipient_id, notification_type, data } = validation.data

    // Get recipient's OneSignal player ID from their profile
    const { data: recipientProfile, error: recipientError } = await supabase
      .from('profiles')
      .select('onesignal_player_id, notification_preferences')
      .eq('user_id', recipient_id)
      .single()

    if (recipientError || !recipientProfile) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    if (!recipientProfile.onesignal_player_id) {
      return NextResponse.json({ 
        error: 'Recipient not subscribed to notifications' 
      }, { status: 400 })
    }

    // Check if recipient has this notification type enabled
    const preferences = recipientProfile.notification_preferences || {}
    const notificationEnabled = checkNotificationPreference(notification_type, preferences)
    
    if (!notificationEnabled) {
      return NextResponse.json({ 
        message: 'Notification type disabled for recipient' 
      }, { status: 200 })
    }

    // Get notification template
    const template = NOTIFICATION_TEMPLATES[notification_type]
    if (!template) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    // Prepare OneSignal notification
    const appId = process.env.NEXT_PUBLIC_ONE_SIGNAL_APP_ID
    if (!appId) {
      return NextResponse.json({ error: 'OneSignal not configured' }, { status: 500 })
    }

    const notification: OneSignalNotification = {
      app_id: appId,
      include_subscription_ids: [recipientProfile.onesignal_player_id],
      headings: { en: template.title },
      contents: { en: template.body },
      web_url: `${process.env.NEXTAUTH_URL}${template.url}`,
      data: {
        notification_type,
        ...data
      }
    }

    // Send notification via OneSignal
    const success = await sendOneSignalNotification(notification)
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
    }

    // Log the notification in database
    try {
      await supabase
        .from('notification_log')
        .insert({
          sender_id: user.id,
          recipient_id,
          notification_type,
          status: 'sent',
          data,
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Failed to log notification:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({ 
      message: 'Notification sent successfully',
      notification_type
    }, { status: 200 })

  } catch (error) {
    console.error('Send notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function checkNotificationPreference(notificationType: string, preferences: Record<string, unknown>): boolean {
  // Map notification types to preference keys
  const preferenceMap: Record<string, string> = {
    ritual_reminder: 'ritual_reminders',
    partner_completed_ritual: 'partner_activity',
    partner_note_added: 'partner_activity', 
    play_invite: 'play_invites',
    play_turn: 'play_invites',
    connection_milestone: 'milestone_celebrations',
    streak_celebration: 'milestone_celebrations'
  }
  
  const preferenceKey = preferenceMap[notificationType]
  if (!preferenceKey) return false
  
  return preferences[preferenceKey] === true
}
