import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStreakManager, type StreakType } from '@/lib/streaks'
import { trackEvent } from '@/lib/analytics'

// Request schemas
const GetStreaksSchema = z.object({
  type: z.enum(['daily_ritual', 'play_engagement', 'partner_interaction', 'weekly_connection', 'monthly_growth']).optional(),
  include_insights: z.boolean().default(false)
})

const UpdateStreakSchema = z.object({
  streak_type: z.enum(['daily_ritual', 'play_engagement', 'partner_interaction', 'weekly_connection', 'monthly_growth']),
  activity_source: z.string().optional(),
  activity_value: z.number().int().min(1).default(1)
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

    // Parse query parameters
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams.entries())
    const validation = GetStreaksSchema.safeParse({
      type: searchParams.type,
      include_insights: searchParams.include_insights === 'true'
    })
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid query parameters', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { type, include_insights } = validation.data
    const streakManager = getStreakManager()

    if (type) {
      // Get specific streak type
      const streakStatus = await streakManager.getUserStreakStatus(user.id, type as StreakType)
      
      if (!streakStatus) {
        return NextResponse.json({ error: 'Failed to get streak status' }, { status: 500 })
      }

      const milestones = await streakManager.getStreakMilestones(type as StreakType)

      return NextResponse.json({
        streak: streakStatus,
        milestones,
        type
      })
    }

    // Get all streaks
    const allStreaks = await streakManager.getAllUserStreaks(user.id)
    
    let insights = null
    if (include_insights) {
      insights = await streakManager.getStreakInsights(user.id)
    }

    trackEvent('streaks_viewed', {
      user_id: user.id,
      include_insights,
      streak_count: Object.keys(allStreaks).length
    })

    return NextResponse.json({
      streaks: allStreaks,
      insights,
      user_id: user.id
    })

  } catch (error) {
    console.error('Streaks API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
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
    const validation = UpdateStreakSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { streak_type, activity_source, activity_value } = validation.data

    const streakManager = getStreakManager()
    const result = await streakManager.updateStreak(
      user.id,
      streak_type,
      activity_source,
      activity_value
    )

    if (!result) {
      return NextResponse.json({ error: 'Failed to update streak' }, { status: 500 })
    }

    // Get updated streak status
    const updatedStatus = await streakManager.getUserStreakStatus(user.id, streak_type)

    return NextResponse.json({
      success: true,
      update_result: result,
      streak_status: updatedStatus,
      message: result.streak_reset 
        ? result.message 
        : result.achievement_earned 
          ? `Streak updated! You earned: ${result.achievement_data?.title}` 
          : `Streak updated to ${result.current_count} days!`
    })

  } catch (error) {
    console.error('Streak update API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}