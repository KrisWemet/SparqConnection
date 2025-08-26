import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for activity logging
const LogActivitySchema = z.object({
  activity_type: z.enum(['ritual_completed', 'note_added', 'appreciation_sent', 'play_move', 'connection_milestone']),
  item_type: z.enum(['dq', 'micro_action', 'appreciation', 'reflection', 'journal']).optional(),
  item_id: z.string().optional(),
  metadata: z.record(z.string(), z.any()).default({})
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
    const days = parseInt(searchParams.get('days') || '7')
    const activity_type = searchParams.get('activity_type')
    const partner_only = searchParams.get('partner_only') === 'true'

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Build query for partner activity
    let activityQuery = supabase
      .from('partner_activity')
      .select(`
        id,
        user_id,
        activity_type,
        activity_date,
        item_type,
        item_id,
        metadata,
        created_at,
        profiles!inner (
          full_name,
          email
        )
      `)
      .gte('activity_date', startDate.toISOString().split('T')[0])
      .order('created_at', { ascending: false })

    if (activity_type) {
      activityQuery = activityQuery.eq('activity_type', activity_type)
    }

    if (partner_only) {
      // Only get partner's activity
      activityQuery = activityQuery.neq('user_id', user.id)
    }

    // Get partner dashboard info
    const { data: dashboardData, error: dashboardError } = await supabase
      .from('partner_dashboard')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (dashboardError) {
      console.error('Error fetching dashboard data:', dashboardError)
    }

    const { data: activities, error: activityError } = await activityQuery

    if (activityError) {
      console.error('Error fetching partner activity:', activityError)
      return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
    }

    // Get connection metrics for recent days
    const { data: metricsData, error: metricsError } = await supabase
      .from('connection_metrics')
      .select('*')
      .eq('pair_id', dashboardData?.pair_id || '')
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: false })

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError)
    }

    // Format activities for easy consumption
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      activity_type: activity.activity_type,
      activity_date: activity.activity_date,
      item_type: activity.item_type,
      item_id: activity.item_id,
      metadata: activity.metadata,
      author: {
        name: Array.isArray(activity.profiles) ? activity.profiles[0]?.full_name || 'Unknown' : 'Unknown',
        email: Array.isArray(activity.profiles) ? activity.profiles[0]?.email || 'Unknown' : 'Unknown',
        is_current_user: activity.user_id === user.id
      },
      created_at: activity.created_at
    }))

    return NextResponse.json({
      activities: formattedActivities,
      dashboard: dashboardData ? {
        pair_id: dashboardData.pair_id,
        partner: {
          name: dashboardData.partner_name,
          email: dashboardData.partner_email
        },
        connection_status: {
          paired_at: dashboardData.paired_at,
          current_streak: dashboardData.current_streak,
          user_completed_today: dashboardData.user_a_completed_today || dashboardData.user_b_completed_today,
          partner_completed_today: dashboardData.user_a_completed_today && dashboardData.user_b_completed_today,
          activities_today: dashboardData.activities_today,
          notes_today: dashboardData.notes_today
        }
      } : null,
      recent_metrics: metricsData || []
    })

  } catch (error) {
    console.error('Partner activity GET error:', error)
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
    const validation = LogActivitySchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { activity_type, item_type, item_id, metadata } = validation.data

    // Get user's pair_id for metrics updating
    const { data: pairData, error: pairError } = await supabase
      .from('pairs')
      .select('id')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .eq('status', 'active')
      .single()

    if (pairError || !pairData) {
      console.warn('User not in active pair:', pairError)
      // Still allow activity logging even if not paired
    }

    // Log the activity
    const { data: activity, error: insertError } = await supabase
      .from('partner_activity')
      .insert({
        user_id: user.id,
        activity_type,
        activity_date: new Date().toISOString().split('T')[0],
        item_type,
        item_id,
        metadata,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      // Handle duplicate activity gracefully
      if (insertError.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          message: 'Activity already logged for today',
          activity_type 
        })
      }
      console.error('Error logging activity:', insertError)
      return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
    }

    // Update connection metrics if user is in a pair
    if (pairData) {
      try {
        await supabase.rpc('update_connection_metrics', {
          target_pair_id: pairData.id,
          target_user_id: user.id,
          activity_type
        })
      } catch (metricsError) {
        console.error('Error updating connection metrics:', metricsError)
        // Don't fail the request if metrics update fails
      }
    }

    return NextResponse.json({ 
      message: 'Activity logged successfully',
      activity: {
        id: activity.id,
        activity_type: activity.activity_type,
        activity_date: activity.activity_date,
        created_at: activity.created_at
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Partner activity POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}