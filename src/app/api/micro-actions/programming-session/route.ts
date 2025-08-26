import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { NeuroscienceMicroActionsService } from '@/lib/neuroscience-micro-actions'

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
      sessionType = 'daily_reinforcement',
      actionCompletedId,
      focusArea,
      userReceptivity
    } = body

    const actionService = new NeuroscienceMicroActionsService()
    
    // Generate personalized programming session
    const programmingSession = await actionService.generateProgrammingSession(
      user.id, 
      {
        sessionType,
        actionCompletedId,
        focusArea,
        userReceptivity
      }
    )

    // Record the session
    const { data: session, error: sessionError } = await supabase
      .from('subconscious_programming_sessions')
      .insert({
        user_id: user.id,
        session_type: sessionType,
        programming_content: programmingSession.content,
        primary_technique: programmingSession.primaryTechnique,
        hypnotic_elements: programmingSession.hypnoticElements,
        brain_state_induced: programmingSession.brainState,
        session_duration_seconds: programmingSession.duration,
        triggered_by_action_id: actionCompletedId,
        user_receptivity_score: userReceptivity
      })
      .select()
      .single()

    if (sessionError) {
      throw sessionError
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        content: programmingSession.content,
        technique: programmingSession.primaryTechnique,
        brainState: programmingSession.brainState,
        duration: programmingSession.duration,
        visualizations: programmingSession.visualizations || [],
        breathingPattern: programmingSession.breathingPattern,
        suggestions: programmingSession.suggestions || []
      }
    })
  } catch (error) {
    console.error('Programming session POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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
      sessionId,
      userReceptivityScore,
      implementationSuccess,
      behavioralChangeObserved
    } = body

    // Update session with completion data
    const { data: updatedSession, error: updateError } = await supabase
      .from('subconscious_programming_sessions')
      .update({
        user_receptivity_score: userReceptivityScore,
        implementation_success: implementationSuccess,
        behavioral_change_observed: behavioralChangeObserved
      })
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      session: updatedSession
    })
  } catch (error) {
    console.error('Programming session PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}