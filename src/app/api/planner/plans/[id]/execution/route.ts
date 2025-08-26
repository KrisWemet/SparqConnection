import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getAIPlannerService } from '@/lib/ai-planner-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      completionRating,
      actualSatisfactionScore,
      userASatisfaction,
      userBSatisfaction,
      userAEnergyLevel,
      userBEnergyLevel,
      userAMoodBefore,
      userAMoodAfter,
      userBMoodBefore,
      userBMoodAfter,
      whatWorkedWell,
      whatCouldImprove,
      wouldDoAgainRating,
      executionNotes
    } = body

    if (
      completionRating === undefined ||
      actualSatisfactionScore === undefined ||
      userASatisfaction === undefined ||
      userBSatisfaction === undefined ||
      wouldDoAgainRating === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required execution data' },
        { status: 400 }
      )
    }

    const plannerService = getAIPlannerService()
    
    const success = await plannerService.recordPlanExecution(params.id, {
      completionRating,
      actualSatisfactionScore,
      userASatisfaction,
      userBSatisfaction,
      userAEnergyLevel: userAEnergyLevel || 3,
      userBEnergyLevel: userBEnergyLevel || 3,
      userAMoodBefore,
      userAMoodAfter,
      userBMoodBefore,
      userBMoodAfter,
      whatWorkedWell: whatWorkedWell || [],
      whatCouldImprove: whatCouldImprove || [],
      wouldDoAgainRating,
      executionNotes
    })

    if (!success) {
      return NextResponse.json({ error: 'Failed to record execution' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Plan execution recorded successfully'
    })
  } catch (error) {
    console.error('Plan execution POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}