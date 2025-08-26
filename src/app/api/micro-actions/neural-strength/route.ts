import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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
    const category = searchParams.get('category')

    if (category) {
      // Get neural strength for specific category
      const { data: strength, error: strengthError } = await supabase
        .rpc('calculate_neural_strength', {
          target_user_id: user.id,
          action_category: category
        })

      if (strengthError) {
        throw strengthError
      }

      return NextResponse.json({ category, strength })
    } else {
      // Get neural strength for all categories
      const categories = ['touch', 'words', 'acts', 'time', 'gifts', 'physical', 'emotional', 'spiritual']
      
      const strengthPromises = categories.map(async (cat) => {
        const { data: strength } = await supabase
          .rpc('calculate_neural_strength', {
            target_user_id: user.id,
            action_category: cat
          })
        return { category: cat, strength: strength || 0 }
      })

      const strengthResults = await Promise.all(strengthPromises)

      // Get recent completions for analytics
      const { data: recentCompletions } = await supabase
        .from('micro_action_completions')
        .select('action_category, completed_at, neural_strength, habit_formation_score')
        .eq('user_id', user.id)
        .gte('completed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('completed_at', { ascending: false })

      return NextResponse.json({
        categoryStrengths: strengthResults,
        recentCompletions: recentCompletions || [],
        totalCompletions: recentCompletions?.length || 0,
        averageHabitScore: recentCompletions?.reduce((sum, c) => sum + (c.habit_formation_score || 0), 0) / (recentCompletions?.length || 1)
      })
    }
  } catch (error) {
    console.error('Neural strength GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}