import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStreakManager } from '@/lib/streaks'
import { achievementManager } from '@/lib/achievements'

// Validation schema for play moves
const PlayMoveSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
  move_data: z.record(z.string(), z.any()),
  round_number: z.number().min(1)
})

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
    const validation = PlayMoveSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { session_id, move_data, round_number } = validation.data

    // Get the play session and verify user access
    const { data: session, error: sessionError } = await supabase
      .from('play_sessions')
      .select(`
        *,
        pairs!inner (
          user_a,
          user_b,
          status
        )
      `)
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const pair = session.pairs
    const isUserInPair = pair.user_a === user.id || pair.user_b === user.id
    const partnerId = pair.user_a === user.id ? pair.user_b : pair.user_a

    if (!isUserInPair || pair.status !== 'active') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (session.completed) {
      return NextResponse.json({ error: 'Game session is already completed' }, { status: 400 })
    }

    if (session.turn_by !== user.id) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 400 })
    }

    if (session.round_number !== round_number) {
      return NextResponse.json({ error: 'Round mismatch' }, { status: 400 })
    }

    // Record the move
    const { error: moveError } = await supabase
      .from('game_moves')
      .insert({
        play_session_id: session_id,
        user_id: user.id,
        round_number,
        move_data,
        created_at: new Date().toISOString()
      })

    if (moveError) {
      console.error('Error recording move:', moveError)
      return NextResponse.json({ error: 'Failed to record move' }, { status: 500 })
    }

    // Update game state based on the move and game type
    const updatedState = updateGameState(session, move_data, user.id)
    const isRoundComplete = checkRoundComplete(session, updatedState)
    const isGameComplete = session.round_number >= session.max_rounds && isRoundComplete

    // Determine next turn
    let nextTurnBy = partnerId
    let nextRoundNumber = session.round_number

    if (isRoundComplete && !isGameComplete) {
      nextRoundNumber += 1
      // For new rounds, original creator goes first, or alternate based on game type
      nextTurnBy = session.game_type === 'you_or_me' ? user.id : partnerId
      
      // Generate next round content if needed
      updatedState.round = nextRoundNumber
      if (session.game_type === 'you_or_me' && updatedState.questions) {
        const questionIndex = (nextRoundNumber - 1) % updatedState.questions.length
        updatedState.current_question = updatedState.questions[questionIndex]
      }
    }

    // Update the play session
    const { data: updatedSession, error: updateError } = await supabase
      .from('play_sessions')
      .update({
        state: updatedState,
        round_number: nextRoundNumber,
        turn_by: isGameComplete ? null : nextTurnBy,
        completed: isGameComplete,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating session:', updateError)
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }

    // Log activity
    try {
      await supabase
        .from('partner_activity')
        .insert({
          user_id: user.id,
          activity_type: 'play_move',
          metadata: { 
            action: isGameComplete ? 'game_completed' : 'move_made',
            game_type: session.game_type,
            session_id: session_id,
            round: nextRoundNumber
          },
          created_at: new Date().toISOString()
        })
    } catch (activityError) {
      console.error('Error logging activity:', activityError)
    }

    // Update play engagement streak and evaluate achievements
    try {
      const streakManager = getStreakManager()
      await streakManager.recordPlayEngagement(user.id, session.game_type)
      
      // Evaluate achievements after play move
      await achievementManager.evaluateUserAchievements(user.id)
      
      // Update achievement progress for play-related achievements
      await achievementManager.updateProgress(user.id, 'game_variety', 1, {
        game_type: session.game_type,
        completed: isGameComplete
      })
      
      if (session.game_type === 'trivia' && isGameComplete) {
        await achievementManager.updateProgress(user.id, 'trivia_master', 1)
      }
    } catch (streakError) {
      console.error('Error updating play streak and achievements:', streakError)
    }

    return NextResponse.json({ 
      message: isGameComplete ? 'Game completed!' : 'Move recorded successfully',
      session: {
        id: updatedSession.id,
        game_type: updatedSession.game_type,
        round_number: updatedSession.round_number,
        max_rounds: updatedSession.max_rounds,
        state: updatedSession.state,
        completed: updatedSession.completed,
        is_user_turn: updatedSession.turn_by === user.id,
        is_round_complete: isRoundComplete,
        is_game_complete: isGameComplete,
        last_activity_at: updatedSession.last_activity_at
      }
    })

  } catch (error) {
    console.error('Play move POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function updateGameState(session: Record<string, unknown>, moveData: Record<string, unknown>, userId: string): Record<string, unknown> {
  const currentState = session.state || {}
  
  switch (session.game_type) {
    case 'you_or_me':
      if (!currentState.answers) currentState.answers = {}
      if (!currentState.scores) currentState.scores = {}
      
      currentState.answers[userId] = moveData.choice // 'you' or 'me'
      
      // If both players have answered, calculate match
      const partnerAnswer = Object.values(currentState.answers).find(answer => 
        Object.keys(currentState.answers).find(key => key !== userId && currentState.answers[key] === answer)
      )
      
      if (Object.keys(currentState.answers).length === 2) {
        const answers = Object.values(currentState.answers)
        const isMatch = answers[0] === answers[1]
        currentState.round_result = {
          match: isMatch,
          answers: currentState.answers
        }
        
        // Update scores
        Object.keys(currentState.answers).forEach(playerId => {
          if (!currentState.scores[playerId]) currentState.scores[playerId] = 0
          if (isMatch) currentState.scores[playerId] += 1
        })
        
        // Clear answers for next round
        currentState.answers = {}
      }
      break
      
    case 'trivia':
      if (!currentState.answers) currentState.answers = {}
      currentState.answers[userId] = moveData.answer
      break
      
    case 'prompts':
      if (!currentState.responses) currentState.responses = {}
      currentState.responses[userId] = moveData.response
      break
      
    case 'compatibility_quiz':
      if (!currentState.answers) currentState.answers = {}
      if (!currentState.answers[currentState.current_category]) {
        currentState.answers[currentState.current_category] = {}
      }
      currentState.answers[currentState.current_category][userId] = moveData.answer
      break
      
    default:
      // Generic move storage
      if (!currentState.moves) currentState.moves = []
      currentState.moves.push({
        user_id: userId,
        data: moveData,
        timestamp: new Date().toISOString()
      })
  }
  
  return currentState
}

function checkRoundComplete(session: any, state: any): boolean {
  const pairUserCount = 2 // Always 2 users in a pair
  
  switch (session.game_type) {
    case 'you_or_me':
      return state.round_result !== undefined
      
    case 'trivia':
      return Object.keys(state.answers || {}).length >= pairUserCount
      
    case 'prompts':
      return Object.keys(state.responses || {}).length >= pairUserCount
      
    case 'compatibility_quiz':
      const currentCategory = state.current_category
      return Object.keys(state.answers?.[currentCategory] || {}).length >= pairUserCount
      
    default:
      return (state.moves || []).length >= pairUserCount
  }
}