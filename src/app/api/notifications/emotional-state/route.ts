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

    const body = await request.json()
    const {
      primaryEmotion,
      emotionIntensity,
      secondaryEmotions,
      stressLevel,
      energyLevel,
      relationshipRelated,
      trigger,
      confidenceScore = 1.0,
      detectionMethod = 'self_reported'
    } = body

    if (!primaryEmotion || emotionIntensity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: primaryEmotion, emotionIntensity' },
        { status: 400 }
      )
    }

    const emotionalContext = {
      primaryEmotion,
      emotionIntensity,
      secondaryEmotions: secondaryEmotions || [],
      stressLevel: stressLevel || 3,
      energyLevel: energyLevel || 3,
      relationshipRelated: relationshipRelated || false,
      trigger,
      confidenceScore
    }

    const notificationService = getEmotionAwareNotificationService()
    
    const success = await notificationService.recordEmotionalState(
      user.id,
      emotionalContext,
      detectionMethod
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to record emotional state' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Emotional state recorded successfully',
      emotionalContext
    })
  } catch (error) {
    console.error('Emotional state POST error:', error)
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

    const notificationService = getEmotionAwareNotificationService()
    
    // Detect current emotional state
    const emotionalState = await notificationService.detectEmotionalState(user.id, {
      timestamp: new Date().toISOString(),
      requestType: 'api_request'
    })

    if (!emotionalState) {
      return NextResponse.json(
        { error: 'Unable to detect emotional state' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      emotionalState
    })
  } catch (error) {
    console.error('Emotional state GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}