import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStreakManager } from '@/lib/streaks'
import { trackEvent } from '@/lib/analytics'

const GetAchievementsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  recent_only: z.boolean().default(false)
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
    const validation = GetAchievementsSchema.safeParse({
      limit: searchParams.limit ? parseInt(searchParams.limit) : undefined,
      recent_only: searchParams.recent_only === 'true'
    })
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid query parameters', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { limit, recent_only } = validation.data
    const streakManager = getStreakManager()

    let achievements
    if (recent_only) {
      achievements = await streakManager.getRecentAchievements(user.id)
    } else {
      achievements = await streakManager.getUserAchievements(user.id, limit)
    }

    // Group achievements by type for better organization
    const achievementsByType = achievements.reduce((acc, achievement) => {
      const type = achievement.achievement_type
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(achievement)
      return acc
    }, {} as Record<string, typeof achievements>)

    // Calculate achievement stats
    const stats = {
      total_count: achievements.length,
      recent_count: recent_only ? achievements.length : await streakManager.getRecentAchievements(user.id).then(r => r.length),
      types: Object.keys(achievementsByType).length,
      latest_earned: achievements.length > 0 ? achievements[0].earned_at : null
    }

    trackEvent('achievements_viewed', {
      user_id: user.id,
      achievements_count: achievements.length,
      recent_only,
      types_count: stats.types
    })

    return NextResponse.json({
      achievements,
      achievements_by_type: achievementsByType,
      stats,
      user_id: user.id
    })

  } catch (error) {
    console.error('Achievements API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}