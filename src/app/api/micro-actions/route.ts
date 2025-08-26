import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { NeuroscienceMicroActionsService } from '@/lib/neuroscience-micro-actions'

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

    // Get user profile for personalization
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const actionService = new NeuroscienceMicroActionsService()
    const personalizedAction = await actionService.getPersonalizedAction(
      user.id,
      {
        primaryLoveLanguage: profile?.primary_love_language || 'words',
        attachmentStyle: profile?.attachment_style || 'secure'
      }
    )

    return NextResponse.json(personalizedAction)
  } catch (error) {
    console.error('Micro-actions GET error:', error)
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

    const body = await request.json()
    const {
      actionText,
      actionCategory,
      difficultyLevel,
      emotionalStateBefore,
      emotionalStateAfter,
      confidenceLevel,
      relationshipImpactRating,
      completionMethod = 'manual',
      proofData
    } = body

    // Get partner info for personalized content
    const { data: partnerData } = await supabase
      .from('pairs')
      .select(`
        partner_a:user_a (full_name),
        partner_b:user_b (full_name)
      `)
      .eq('status', 'active')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .single()

    const partner = partnerData?.user_a?.full_name === user.user_metadata?.full_name 
      ? partnerData.partner_b 
      : partnerData.partner_a
    
    const partnerName = partner?.full_name || 'your partner'

    const actionService = new NeuroscienceMicroActionsService()
    
    // Record completion with neuroscience analysis
    const completion = await actionService.recordCompletion(user.id, {
      actionText,
      actionCategory,
      difficultyLevel,
      emotionalStateBefore,
      emotionalStateAfter,
      confidenceLevel,
      relationshipImpactRating,
      completionMethod,
      proofData
    })

    // Generate hypnotic affirmation
    const { data: affirmation } = await supabase
      .rpc('generate_hypnotic_affirmation', {
        target_user_id: user.id,
        action_completed: actionText,
        partner_name: partnerName
      })

    // Calculate neural pathway strength
    const { data: neuralStrength } = await supabase
      .rpc('calculate_neural_strength', {
        target_user_id: user.id,
        action_category: actionCategory
      })

    return NextResponse.json({
      success: true,
      completion,
      affirmation,
      neuralStrength,
      celebrationLevel: completion.experiencePoints >= 100 ? 'breakthrough' : 'standard'
    })
  } catch (error) {
    console.error('Micro-actions POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}