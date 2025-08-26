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
    const duration = searchParams.get('duration') 
      ? parseInt(searchParams.get('duration')!) 
      : 60
    const startDate = searchParams.get('start_date')
      ? new Date(searchParams.get('start_date')!)
      : new Date()
    const endDate = searchParams.get('end_date')
      ? new Date(searchParams.get('end_date')!)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now

    const plannerService = getAIPlannerService()
    
    const optimalTiming = await plannerService.calculateOptimalTiming(
      pair.id,
      duration,
      { start: startDate, end: endDate }
    )

    if (!optimalTiming) {
      return NextResponse.json({ error: 'Unable to calculate optimal timing' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      optimalTiming
    })
  } catch (error) {
    console.error('Optimal timing GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}