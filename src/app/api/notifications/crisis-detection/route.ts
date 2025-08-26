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

    const notificationService = getEmotionAwareNotificationService()
    
    // Detect and intervene in relationship crisis
    const crisisDetection = await notificationService.detectAndInterveneCrisis(pair.id)

    if (!crisisDetection) {
      return NextResponse.json({
        success: true,
        message: 'No crisis detected',
        crisisDetected: false
      })
    }

    return NextResponse.json({
      success: true,
      crisisDetected: true,
      crisis: crisisDetection,
      message: 'Crisis detected and intervention triggered'
    })
  } catch (error) {
    console.error('Crisis detection POST error:', error)
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

    // Get crisis detection history
    const { data: crises, error } = await supabase
      .from('relationship_crisis_detection')
      .select('*')
      .eq('pair_id', pair.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch crisis history' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      crises: crises || [],
      count: crises?.length || 0
    })
  } catch (error) {
    console.error('Crisis detection GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}