import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Validation schema for alternative question request
const AlternativeQuestionSchema = z.object({
  current_question: z.string(),
  tags: z.array(z.string()).optional(),
  date: z.string().optional()
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
    const validation = AlternativeQuestionSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { current_question, tags = [], date } = validation.data

    // Check if user has already swapped today (limit: 1 swap per day)
    const today = date || new Date().toISOString().split('T')[0]
    
    const { data: swapHistory, error: historyError } = await supabase
      .from('daily_swaps')
      .select('id')
      .eq('user_id', user.id)
      .eq('swap_date', today)
      .maybeSingle()

    if (historyError) {
      console.error('Error checking swap history:', historyError)
      return NextResponse.json({ error: 'Failed to check swap history' }, { status: 500 })
    }

    if (swapHistory) {
      return NextResponse.json({ 
        error: 'Swap limit reached',
        message: 'You can only swap once per day. Try again tomorrow!'
      }, { status: 429 })
    }

    // Get alternative questions with similar tags
    let alternativeQuery = supabase
      .from('quest_days')
      .select('dq, tags')
      .neq('dq', current_question)
      .limit(10)

    // If tags are provided, try to find questions with overlapping tags
    if (tags.length > 0) {
      alternativeQuery = alternativeQuery.overlaps('tags', tags)
    }

    const { data: alternatives, error: alternativesError } = await alternativeQuery

    if (alternativesError) {
      console.error('Error fetching alternatives:', alternativesError)
      return NextResponse.json({ error: 'Failed to fetch alternatives' }, { status: 500 })
    }

    if (!alternatives || alternatives.length === 0) {
      // Fallback to any question that's not the current one
      const { data: fallbackQuestions } = await supabase
        .from('quest_days')
        .select('dq, tags')
        .neq('dq', current_question)
        .limit(20)

      if (fallbackQuestions && fallbackQuestions.length > 0) {
        const randomIndex = Math.floor(Math.random() * fallbackQuestions.length)
        const selectedQuestion = fallbackQuestions[randomIndex]
        
        // Log the swap
        await logSwap(supabase, user.id, today, current_question, selectedQuestion.dq, selectedQuestion.tags)
        
        return NextResponse.json({
          question: selectedQuestion.dq,
          tags: selectedQuestion.tags || [],
          message: 'Here\'s a different question for today!'
        })
      } else {
        return NextResponse.json({ 
          error: 'No alternative questions available',
          message: 'Sorry, no alternative questions are available right now.'
        }, { status: 404 })
      }
    }

    // Select a random alternative from the matches
    const randomIndex = Math.floor(Math.random() * alternatives.length)
    const selectedQuestion = alternatives[randomIndex]

    // Log the swap
    await logSwap(supabase, user.id, today, current_question, selectedQuestion.dq, selectedQuestion.tags)

    return NextResponse.json({
      question: selectedQuestion.dq,
      tags: selectedQuestion.tags || [],
      message: 'Here\'s an alternative question with similar themes!'
    })

  } catch (error) {
    console.error('Alternative question error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function logSwap(
  supabase: any,
  userId: string, 
  swapDate: string, 
  originalQuestion: string, 
  newQuestion: string,
  newTags: string[]
) {
  try {
    await supabase
      .from('daily_swaps')
      .insert({
        user_id: userId,
        swap_date: swapDate,
        original_question: originalQuestion,
        new_question: newQuestion,
        new_tags: newTags,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging swap:', error)
    // Don't fail the request if logging fails
  }
}