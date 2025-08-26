import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Validation schema for notification preferences
const UpdatePreferencesSchema = z.object({
  onesignal_player_id: z.string().optional(),
  notification_preferences: z.object({
    ritual_reminders: z.boolean(),
    partner_activity: z.boolean(),
    play_invites: z.boolean(),
    milestone_celebrations: z.boolean()
  }).optional()
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

    // Get user's notification preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onesignal_player_id, notification_preferences')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching notification preferences:', profileError)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    return NextResponse.json({
      onesignal_player_id: profile.onesignal_player_id,
      notification_preferences: profile.notification_preferences || {
        ritual_reminders: true,
        partner_activity: true,
        play_invites: true,
        milestone_celebrations: true
      }
    })

  } catch (error) {
    console.error('Get notification preferences error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    const validation = UpdatePreferencesSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { onesignal_player_id, notification_preferences } = validation.data

    // Build update object
    const updateData: { 
      onesignal_player_id?: string
      notification_preferences?: Record<string, boolean>
      updated_at: string 
    } = {
      updated_at: new Date().toISOString()
    }

    if (onesignal_player_id !== undefined) {
      updateData.onesignal_player_id = onesignal_player_id
    }

    if (notification_preferences) {
      updateData.notification_preferences = notification_preferences
    }

    // Update user profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating notification preferences:', updateError)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Notification preferences updated successfully'
    })

  } catch (error) {
    console.error('Update notification preferences error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}