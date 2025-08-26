import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getAIPlannerService } from '@/lib/ai-planner-service'

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

    // Get user's active pair
    const { data: pair, error: pairError } = await supabase
      .from('pairs')
      .select('id')
      .eq('status', 'active')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .single()

    if (pairError || !pair) {
      return NextResponse.json({ error: 'No active pair found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as any
    const targetDate = searchParams.get('target_date') 
      ? new Date(searchParams.get('target_date')!) 
      : undefined
    const duration = searchParams.get('duration') 
      ? parseInt(searchParams.get('duration')!) 
      : undefined
    const energyLevel = searchParams.get('energy_level')
      ? parseInt(searchParams.get('energy_level')!)
      : undefined
    const moodContext = searchParams.get('mood_context')

    const plannerService = getAIPlannerService()
    
    const suggestions = await plannerService.generatePlanSuggestions(pair.id, {
      category,
      targetDate,
      durationPreference: duration,
      energyLevel,
      moodContext
    })

    return NextResponse.json({
      success: true,
      suggestions,
      count: suggestions.length
    })
  } catch (error) {
    console.error('Planner suggestions GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}