import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { formatInTimeZone } from 'date-fns-tz'
import { 
  getPersonalizer, 
  getCachedPersonalization, 
  setCachedPersonalization,
  type UserProfile,
  type QuestInfo,
  type RecentActivity 
} from '@/lib/personalizer'
import { BaseDayContent } from '@/lib/schemas'
import { trackEvent } from '@/lib/analytics'

// Request validation schema
const PersonalizeRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD, defaults to today
  timezone: z.string().default('UTC'),
  force_regenerate: z.boolean().default(false)
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

    // Parse and validate request
    const body = await request.json()
    const validation = PersonalizeRequestSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { date, timezone, force_regenerate } = validation.data

    // Determine target date
    const targetDate = date || formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd')

    // Get user profile for personalization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        current_identity,
        attachment_style,
        love_languages,
        attachment_tendencies,
        love_language_rank,
        boundaries_comfort,
        time_preference,
        tone_preference,
        life_stage,
        is_long_distance,
        cohabiting,
        children_count,
        is_shift_worker,
        cultural_notes
      `)
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get current quest and day for context
    const { data: questProgress } = await supabase
      .from('user_quest_progress')
      .select(`
        current_quest_id,
        current_day,
        quests:current_quest_id (
          title,
          version
        )
      `)
      .eq('user_id', user.id)
      .single()

    // Get canonical content from quest_days
    const questId = questProgress?.current_quest_id || 'default-quest'
    const questDay = questProgress?.current_day || 1

    const { data: questDayData, error: questError } = await supabase
      .from('quest_days')
      .select('base_content, version')
      .eq('quest_id', questId)
      .eq('day', questDay)
      .single()

    if (questError || !questDayData) {
      // Fallback to any available canonical content
      const { data: fallbackData } = await supabase
        .from('quest_days')
        .select('base_content, version')
        .order('quest_id')
        .order('day')
        .limit(1)
        .single()

      if (!fallbackData) {
        return NextResponse.json({ error: 'No base content available' }, { status: 500 })
      }
      
      questDayData = {
        base_content: fallbackData.base_content,
        version: fallbackData.version
      }
    }

    // Create cache key (include version for cache invalidation)
    const cacheKey = `${user.id}:${targetDate}:${questId}:${questDay}:v${questDayData.version}`

    // Check cache first (unless force regeneration)
    if (!force_regenerate) {
      const cached = getCachedPersonalization(cacheKey)
      if (cached) {
        return NextResponse.json(cached)
      }
    }

    // Get recent activity for streak context
    const { data: recentActivity } = await supabase
      .from('user_activities')
      .select('activity_type, created_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('created_at', { ascending: false })

    // Calculate streak and recent completion status
    const microActionsCompleted = recentActivity?.filter(a => 
      a.activity_type === 'micro_action_completed'
    ).length || 0
    
    const recent: RecentActivity = {
      micro_done: microActionsCompleted > 0,
      streak: Math.min(microActionsCompleted, 7) // Cap at 7 for streak display
    }

    // Build user profile for AI
    // Map new structured fields to legacy fields with graceful fallback
    const derivedAttachment = (profile.attachment_tendencies?.primary as any) || profile.attachment_style || 'secure'
    const derivedLoveLanguages = (profile.love_language_rank?.order as any) || profile.love_languages || ['words']

    const userProfile: UserProfile = {
      identity: profile.current_identity || 'Mindful Partner',
      attachment: derivedAttachment,
      love_languages: derivedLoveLanguages,
      boundaries_comfort: profile.boundaries_comfort || 3,
      time_pref: profile.time_preference || 'morning',
      tone: profile.tone_preference || undefined,
      context: {
        life_stage: profile.life_stage || 'married',
        long_distance: profile.is_long_distance || false,
        cohabiting: profile.cohabiting || true,
        children_count: profile.children_count || 0,
        shift_worker: profile.is_shift_worker || false,
        cultural_notes: profile.cultural_notes
      }
    }

    const quest: QuestInfo = {
      id: questId,
      title: questProgress?.quests?.title || 'Daily Connection',
      day: questDay
    }

    const canonicalDay: BaseDayContent = questDayData.base_content as BaseDayContent

    // Personalize with AI
    const personalizer = getPersonalizer()
    
    trackEvent('personalization_requested', {
      user_id: user.id,
      target_date: targetDate,
      quest_id: questId,
      quest_day: questDay,
      force_regenerate,
      cache_key: cacheKey
    })

    const personalizedPlan = await personalizer.personalize({
      canonical_day: canonicalDay,
      user_profile: userProfile,
      quest,
      recent,
      version: questDayData.version || 1,
      date: targetDate,
      timezone
    })

    // Cache the result
    setCachedPersonalization(cacheKey, personalizedPlan)

    // Optionally save to database for persistence
    if (targetDate === formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd')) {
      // Only save "today's" plan to avoid cluttering DB
      await supabase
        .from('daily_plans')
        .upsert({
          user_id: user.id,
          date: targetDate,
          content: personalizedPlan,
          version: questDayData.version || 1,
          created_at: new Date().toISOString()
        })
        .select()
    }

    return NextResponse.json(personalizedPlan)

  } catch (error) {
    console.error('Personalization API error:', error)
    
    trackEvent('personalization_api_error', {
      error_message: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({ 
      error: 'Failed to personalize daily content' 
    }, { status: 500 })
  }
}
