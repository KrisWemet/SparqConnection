// app/api/daily/today/route.ts
import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase-server";
import { DailyPlanSchema, type DailyPlan } from "@/lib/schemas";
import { formatInTimeZone } from "date-fns-tz";
import { 
  getPersonalizer, 
  getCachedPersonalization,
  setCachedPersonalization,
  type UserProfile,
  type QuestInfo,
  type RecentActivity 
} from "@/lib/personalizer";
import { trackEvent } from "@/lib/analytics";
import { applyPlainLanguage } from "@/lib/text";

export async function GET() {
  const supabase = await createClient();

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // derive YYYY-MM-DD in user tz (fallback to UTC)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const today = formatInTimeZone(new Date(), tz, "yyyy-MM-dd");

    // Track daily content request
    trackEvent('daily_content_requested', {
      user_id: user?.id,
      date: today,
      timezone: tz
    })

    // If no authenticated user, return basic canonical content using service role
    if (userError || !user) {
      const serviceSupabase = createServiceRoleClient()
      return await getCanonicalFallback(serviceSupabase, today)
    }

    // 1) Check for existing personalized plan in database
    const { data: existingPlan } = await supabase
      .from("daily_plans")
      .select("content, version")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    if (existingPlan?.content) {
      // Validate existing plan
      const parsed = DailyPlanSchema.safeParse(existingPlan.content);
      if (parsed.success) {
        trackEvent('daily_content_from_db', { user_id: user.id, date: today })
        return NextResponse.json(parsed.data);
      }
    }

    // 2) Check cache for personalized plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_identity, attachment_style, settings')
      .eq('user_id', user.id)
      .single()

    const { data: questProgress } = await supabase
      .from('user_quest_progress')
      .select('current_quest_id, current_day')
      .eq('user_id', user.id)
      .single()

    const questId = questProgress?.current_quest_id || 'default-quest'
    const questDay = questProgress?.current_day || 1

    // Get version for cache key
    const { data: questDayData } = await supabase
      .from('quest_days')
      .select('version')
      .eq('quest_id', questId)
      .eq('day', questDay)
      .single()

    const version = questDayData?.version || 1
    const cacheKey = `${user.id}:${today}:${questId}:${questDay}:v${version}`

    const cachedPlan = getCachedPersonalization(cacheKey)
    if (cachedPlan) {
      trackEvent('daily_content_from_cache', { 
        user_id: user.id, 
        date: today,
        cache_key: cacheKey
      })
      return NextResponse.json(cachedPlan)
    }

    // 3) Try to generate personalized content with AI
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const personalizedPlan = await generatePersonalizedPlan(supabase, user.id, today, tz)
        if (personalizedPlan) {
          // Cache and save the personalized plan
          setCachedPersonalization(cacheKey, personalizedPlan)
          
          await supabase
            .from('daily_plans')
            .upsert({
              user_id: user.id,
              date: today,
              content: personalizedPlan,
              version,
              created_at: new Date().toISOString()
            })
            
          trackEvent('daily_content_personalized', { 
            user_id: user.id, 
            date: today,
            identity: personalizedPlan.identity
          })
          return NextResponse.json(personalizedPlan)
        }
      } catch (error) {
        console.error('Personalization failed, falling back:', error)
        trackEvent('daily_personalization_failed', {
          user_id: user.id,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // 4) Fallback to enhanced canonical content with user context
    return await getEnhancedCanonicalContent(supabase, user.id, today, profile?.current_identity)

  } catch (error) {
    console.error('Daily content API error:', error)
    trackEvent('daily_content_error', {
      error_message: error instanceof Error ? error.message : 'Unknown error'
    })
    
    // Ultimate fallback - use service role client to bypass RLS
    const serviceSupabase = createServiceRoleClient()
    return await getCanonicalFallback(serviceSupabase, formatInTimeZone(new Date(), 'UTC', 'yyyy-MM-dd'))
  }
}

async function generatePersonalizedPlan(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, date: string, timezone: string) {
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      current_identity,
      attachment_style,
      love_languages,
      boundaries_comfort,
      time_preference,
      life_stage,
      is_long_distance,
      cohabiting,
      children_count,
      is_shift_worker,
      cultural_notes,
      settings
    `)
    .eq('user_id', userId)
    .single()

  if (!profile) return null

  // Get quest context
  const { data: questProgress } = await supabase
    .from('user_quest_progress')
    .select(`
      current_quest_id,
      current_day,
      quests:current_quest_id (title, version)
    `)
    .eq('user_id', userId)
    .single()

  const questId = questProgress?.current_quest_id || 'default-quest'
  const questDay = questProgress?.current_day || 1

  // Get canonical content
  const { data: questDayData } = await supabase
    .from('quest_days')
    .select('base_content, version')
    .eq('quest_id', questId)
    .eq('day', questDay)
    .single()

  if (!questDayData) return null

  // Get recent activity for streak
  const { data: recentActivity } = await supabase
    .from('user_activities')
    .select('activity_type')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    
  const microActionsCompleted = recentActivity?.filter(a => 
    a.activity_type === 'micro_action_completed'
  ).length || 0

  // Build personalization request
  const userProfile: UserProfile = {
    identity: profile.current_identity || 'Mindful Partner',
    attachment: profile.attachment_style || 'secure',
    love_languages: profile.love_languages || ['words'],
    boundaries_comfort: profile.boundaries_comfort || 3,
    time_pref: profile.time_preference || 'morning',
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

  const recent: RecentActivity = {
    micro_done: microActionsCompleted > 0,
    streak: Math.min(microActionsCompleted, 7)
  }

  // Generate personalized plan
  const personalizer = getPersonalizer()
  return await personalizer.personalize({
    canonical_day: questDayData.base_content,
    user_profile: userProfile,
    quest,
    recent,
    version: questDayData.version || 1,
    date,
    timezone,
    plain_language: profile?.settings?.plain_language ?? true
  })
}

async function getEnhancedCanonicalContent(supabase: ReturnType<typeof createClient>, userId: string, date: string, identity?: string) {
  const { data: fallback } = await supabase
    .from("quest_days")
    .select("version, base_content")
    .order("quest_id")
    .order("day")
    .limit(1)
    .single();

  if (!fallback?.base_content) {
    return NextResponse.json({ error: "No content available" }, { status: 404 });
  }

  const base = fallback.base_content as {
    story: string;
    dq: string;
    micro_action: string;
    journal: string;
    reflection: string;
    tags?: string[];
  };

  const enhanced = {
    date,
    identity: identity || "Mindful Partner",
    story: applyPlainLanguage(base.story, true),
    dq: applyPlainLanguage(base.dq, true),
    micro_action: applyPlainLanguage(base.micro_action, true),
    journal: applyPlainLanguage(base.journal, true),
    reflection: applyPlainLanguage(base.reflection, true),
    appreciation_templates: [
      applyPlainLanguage("I appreciate how you...", true),
      applyPlainLanguage("Thank you for doing...", true)
    ],
    tags: base.tags ?? [],
    version: fallback.version ?? 1
  };

  const parsed = DailyPlanSchema.parse(enhanced);
  
  trackEvent('daily_content_enhanced_canonical', { 
    user_id: userId, 
    date,
    identity: enhanced.identity
  })
  
  return NextResponse.json(parsed);
}

async function getCanonicalFallback(supabase: Awaited<ReturnType<typeof createClient>>, date: string) {
  const { data: fallback } = await supabase
    .from("quest_days")
    .select("version, base_content")
    .order("quest_id")
    .order("day")
    .limit(1)
    .single();

  if (!fallback?.base_content) {
    return NextResponse.json({ error: "No content available" }, { status: 404 });
  }

  const base = fallback.base_content as {
    story: string;
    dq: string;
    micro_action: string;
    journal: string;
    reflection: string;
    tags?: string[];
  };

  const minimal = {
    date,
    identity: "Patient Listener",
    story: applyPlainLanguage(base.story, true),
    dq: applyPlainLanguage(base.dq, true),
    micro_action: applyPlainLanguage(base.micro_action, true),
    journal: applyPlainLanguage(base.journal, true),
    reflection: applyPlainLanguage(base.reflection, true),
    appreciation_templates: [],
    tags: base.tags ?? [],
    version: fallback.version ?? 1
  };

  const parsed = DailyPlanSchema.parse(minimal);
  
  trackEvent('daily_content_canonical_fallback', { date })
  
  return NextResponse.json(parsed);
}
