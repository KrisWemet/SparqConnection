import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for achievements query
const AchievementsQuerySchema = z.object({
  category: z.string().optional(),
  include_progress: z.boolean().default(true),
  include_couple: z.boolean().default(false)
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
    const { searchParams } = new URL(request.url)
    const params = {
      category: searchParams.get('category') || undefined,
      include_progress: searchParams.get('include_progress') !== 'false',
      include_couple: searchParams.get('include_couple') === 'true'
    }

    const validation = AchievementsQuerySchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid parameters',
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { category, include_progress, include_couple } = validation.data

    // Get user achievements
    let achievementsQuery = supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_visible', true)
      .order('earned_at', { ascending: false })

    if (category) {
      achievementsQuery = achievementsQuery.eq('achievement_type', category)
    }

    const { data: achievements, error: achievementsError } = await achievementsQuery

    if (achievementsError) {
      console.error('Error fetching achievements:', achievementsError)
      return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 })
    }

    // Get achievement definitions
    let definitionsQuery = supabase
      .from('achievement_definitions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (category) {
      definitionsQuery = definitionsQuery.eq('category', category)
    }

    const { data: definitions, error: definitionsError } = await definitionsQuery

    if (definitionsError) {
      console.error('Error fetching achievement definitions:', definitionsError)
      return NextResponse.json({ error: 'Failed to fetch achievement definitions' }, { status: 500 })
    }

    let progress = []
    let coupleAchievements = []

    // Get achievement progress if requested
    if (include_progress) {
      const { data: progressData, error: progressError } = await supabase
        .from('user_achievement_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('last_progress_date', { ascending: false })

      if (progressError) {
        console.error('Error fetching achievement progress:', progressError)
      } else {
        progress = progressData || []
      }
    }

    // Get couple achievements if requested
    if (include_couple) {
      // First, get the user's active pair
      const { data: pairs, error: pairsError } = await supabase
        .from('pairs')
        .select('id')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .eq('status', 'active')

      if (!pairsError && pairs && pairs.length > 0) {
        const pairId = pairs[0].id
        
        const { data: coupleData, error: coupleError } = await supabase
          .from('couple_achievements')
          .select('*')
          .eq('pair_id', pairId)
          .eq('is_visible', true)
          .order('earned_at', { ascending: false })

        if (!coupleError) {
          coupleAchievements = coupleData || []
        }
      }
    }

    // Calculate achievement stats
    const achievementStats = {
      total_achievements: achievements?.length || 0,
      achievements_by_category: achievements?.reduce((acc, achievement) => {
        acc[achievement.achievement_type] = (acc[achievement.achievement_type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {},
      achievement_rate: definitions && definitions.length > 0 
        ? Math.round(((achievements?.length || 0) / definitions.length) * 100)
        : 0,
      recent_achievements: achievements?.slice(0, 5) || []
    }

    return NextResponse.json({
      achievements: achievements || [],
      definitions: definitions || [],
      progress: progress || [],
      couple_achievements: coupleAchievements || [],
      stats: achievementStats
    })

  } catch (error) {
    console.error('Achievements API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST endpoint to manually trigger achievement evaluation
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

    // Trigger achievement evaluation
    const { data: result, error: evaluationError } = await supabase
      .rpc('evaluate_user_achievements', { target_user_id: user.id })

    if (evaluationError) {
      console.error('Error evaluating achievements:', evaluationError)
      return NextResponse.json({ error: 'Failed to evaluate achievements' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Achievement evaluation completed',
      results: result
    })

  } catch (error) {
    console.error('Achievement evaluation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}