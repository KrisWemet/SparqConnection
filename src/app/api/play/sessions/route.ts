import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schemas
const CreatePlaySessionSchema = z.object({
  game_type: z.enum(['you_or_me', 'trivia', 'prompts', 'compatibility_quiz']),
  max_rounds: z.number().min(1).max(20).default(5)
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'active', 'completed'
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get user's active pair
    const { data: pairData, error: pairError } = await supabase
      .from('pairs')
      .select('id')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .eq('status', 'active')
      .single()

    if (pairError || !pairData) {
      return NextResponse.json({ 
        sessions: [],
        message: 'No active connection found'
      })
    }

    // Build query for play sessions
    let sessionsQuery = supabase
      .from('play_sessions')
      .select(`
        id,
        pair_id,
        game_type,
        round_number,
        max_rounds,
        turn_by,
        completed,
        state,
        last_activity_at,
        created_at,
        updated_at,
        pairs!inner (
          user_a,
          user_b,
          profiles_user_a:profiles!pairs_user_a_fkey (
            full_name,
            email
          ),
          profiles_user_b:profiles!pairs_user_b_fkey (
            full_name,
            email
          )
        )
      `)
      .eq('pair_id', pairData.id)
      .order('last_activity_at', { ascending: false })
      .limit(limit)

    if (status === 'active') {
      sessionsQuery = sessionsQuery.eq('completed', false)
    } else if (status === 'completed') {
      sessionsQuery = sessionsQuery.eq('completed', true)
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery

    if (sessionsError) {
      console.error('Error fetching play sessions:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch play sessions' }, { status: 500 })
    }

    // Format sessions for client consumption
    const formattedSessions = sessions.map(session => {
      const pair = Array.isArray(session.pairs) ? session.pairs[0] : session.pairs
      const userA = Array.isArray(pair?.profiles_user_a) ? pair.profiles_user_a[0] : null
      const userB = Array.isArray(pair?.profiles_user_b) ? pair.profiles_user_b[0] : null
      
      return {
        id: session.id,
        game_type: session.game_type,
        round_number: session.round_number,
        max_rounds: session.max_rounds,
        completed: session.completed,
        state: session.state,
        turn_by: session.turn_by,
        is_user_turn: session.turn_by === user.id,
        partner: {
          id: pair?.user_a === user.id ? pair?.user_b : pair?.user_a,
          name: pair?.user_a === user.id ? userB?.full_name : userA?.full_name,
          email: pair?.user_a === user.id ? userB?.email : userA?.email
        },
        progress: {
          current_round: session.round_number,
          total_rounds: session.max_rounds,
          percentage: Math.round((session.round_number / session.max_rounds) * 100)
        },
        last_activity_at: session.last_activity_at,
        created_at: session.created_at
      }
    })

    return NextResponse.json({
      sessions: formattedSessions,
      total_active: formattedSessions.filter(s => !s.completed).length,
      total_completed: formattedSessions.filter(s => s.completed).length
    })

  } catch (error) {
    console.error('Play sessions GET error:', error)
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

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = CreatePlaySessionSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { game_type, max_rounds } = validation.data

    // Get user's active pair
    const { data: pairData, error: pairError } = await supabase
      .from('pairs')
      .select('id, user_a, user_b')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .eq('status', 'active')
      .single()

    if (pairError || !pairData) {
      return NextResponse.json({ 
        error: 'No active connection found. Connect with a partner first.' 
      }, { status: 400 })
    }

    // Check if there are too many active sessions
    const { data: activeSessions, error: activeError } = await supabase
      .from('play_sessions')
      .select('id')
      .eq('pair_id', pairData.id)
      .eq('completed', false)

    if (activeError) {
      console.error('Error checking active sessions:', activeError)
    } else if (activeSessions && activeSessions.length >= 3) {
      return NextResponse.json({ 
        error: 'Too many active games. Complete some existing games first.' 
      }, { status: 400 })
    }

    // Generate initial game state based on game type
    const initialState = generateInitialGameState(game_type)
    
    // Create new play session
    const { data: session, error: insertError } = await supabase
      .from('play_sessions')
      .insert({
        pair_id: pairData.id,
        game_type,
        round_number: 1,
        max_rounds,
        turn_by: user.id, // Creator starts first
        completed: false,
        state: initialState,
        last_activity_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating play session:', insertError)
      return NextResponse.json({ error: 'Failed to create game session' }, { status: 500 })
    }

    // Log activity
    try {
      await supabase
        .from('partner_activity')
        .insert({
          user_id: user.id,
          activity_type: 'play_move',
          metadata: { 
            action: 'game_created',
            game_type,
            session_id: session.id
          },
          created_at: new Date().toISOString()
        })
    } catch (activityError) {
      console.error('Error logging activity:', activityError)
    }

    return NextResponse.json({ 
      message: 'Game session created successfully',
      session: {
        id: session.id,
        game_type: session.game_type,
        round_number: session.round_number,
        max_rounds: session.max_rounds,
        state: session.state,
        is_user_turn: true,
        created_at: session.created_at
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Play sessions POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateInitialGameState(gameType: string): any {
  const currentRound = 1
  
  switch (gameType) {
    case 'you_or_me':
      return {
        questions: [
          "Who is more likely to forget where they put their keys?",
          "Who is more likely to cry during a movie?",
          "Who is more likely to stay up too late scrolling their phone?",
          "Who is more likely to try a weird food combination?",
          "Who is more likely to get lost even with GPS?"
        ],
        current_question: "Who is more likely to forget where they put their keys?",
        round: currentRound,
        answers: {},
        scores: {}
      }
      
    case 'trivia':
      return {
        questions: [
          {
            question: "In what year did you two first meet?",
            type: "open",
            round: currentRound
          }
        ],
        current_question_index: 0,
        answers: {},
        scores: {}
      }
      
    case 'prompts':
      return {
        prompts: [
          "Share a favorite memory from this past month",
          "What's something you're grateful for about your partner?",
          "Describe a moment when you felt really connected",
          "What's one thing you'd like to try together?",
          "Share something that made you smile recently"
        ],
        current_prompt: "Share a favorite memory from this past month",
        round: currentRound,
        responses: {}
      }
      
    case 'compatibility_quiz':
      return {
        categories: ['communication', 'lifestyle', 'future_goals', 'values', 'fun'],
        current_category: 'communication',
        questions: {
          communication: "How do you prefer to resolve disagreements?",
        },
        answers: {},
        compatibility_score: null
      }
      
    default:
      return {
        round: currentRound,
        game_data: {}
      }
  }
}