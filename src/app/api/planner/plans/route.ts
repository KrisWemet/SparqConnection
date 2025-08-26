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
    const status = searchParams.get('status') as any
    const category = searchParams.get('category') as any
    const startDate = searchParams.get('start_date')
      ? new Date(searchParams.get('start_date')!)
      : undefined
    const endDate = searchParams.get('end_date')
      ? new Date(searchParams.get('end_date')!)
      : undefined

    const plannerService = getAIPlannerService()
    
    const plans = await plannerService.getUserPlans(pair.id, {
      status,
      category,
      dateRange: startDate && endDate ? { start: startDate, end: endDate } : undefined
    })

    return NextResponse.json({
      success: true,
      plans,
      count: plans.length
    })
  } catch (error) {
    console.error('Plans GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    const body = await request.json()
    const {
      templateId,
      title,
      description,
      planType,
      category,
      scheduledDate,
      durationMinutes,
      locationType,
      locationDetails,
      customizations
    } = body

    if (!title || !planType || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: title, planType, category' },
        { status: 400 }
      )
    }

    const plannerService = getAIPlannerService()
    
    const plan = await plannerService.createPlan({
      pairId: pair.id,
      templateId,
      title,
      description,
      planType,
      category,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      durationMinutes,
      locationType,
      locationDetails,
      customizations
    })

    if (!plan) {
      return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      plan
    })
  } catch (error) {
    console.error('Plans POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}