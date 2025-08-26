// lib/personalizer.ts
import { getOpenRouterClient } from './openrouter'
import { DailyPlan, BaseDayContent, parseDailyPlan } from './schemas'
import { applyPlainLanguage } from './text'
import { trackEvent } from './analytics'

export interface UserProfile {
  identity: string
  attachment: 'avoidant' | 'anxious' | 'secure' | 'mixed'
  love_languages: Array<'acts' | 'words' | 'time' | 'gifts' | 'touch'>
  boundaries_comfort: number // 1-5
  time_pref: 'morning' | 'evening'
  tone?: 'fun' | 'gentle'
  context: {
    life_stage: string
    long_distance: boolean
    cohabiting: boolean
    children_count: number
    shift_worker: boolean
    cultural_notes?: string | null
  }
}

export interface QuestInfo {
  id: string
  title: string
  day: number
}

export interface RecentActivity {
  micro_done: boolean
  streak: number
}

export interface PersonalizationRequest {
  canonical_day: BaseDayContent
  user_profile: UserProfile
  quest: QuestInfo
  recent: RecentActivity
  version: number
  date: string
  timezone: string
  plain_language?: boolean
}

export class Personalizer {
  private client = getOpenRouterClient()
  
  private mapPlan(plan: DailyPlan): DailyPlan {
    return {
      ...plan,
      story: applyPlainLanguage(plan.story, true),
      dq: applyPlainLanguage(plan.dq, true),
      micro_action: applyPlainLanguage(plan.micro_action, true),
      journal: applyPlainLanguage(plan.journal, true),
      reflection: applyPlainLanguage(plan.reflection, true),
      appreciation_templates: (plan.appreciation_templates || []).map(t => applyPlainLanguage(t, true)),
    }
  }

  async personalize(request: PersonalizationRequest): Promise<DailyPlan> {
    const startTime = Date.now()

    try {
      // Create system prompt from template
      const systemPrompt = this.buildSystemPrompt()
      
      // Create user prompt with all context
      const userPrompt = this.buildUserPrompt(request)

      // Call AI with fallback chain
      const { response, modelUsed } = await this.client.chatWithFallback(
        'personalizer',
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        { 
          response_format: { type: 'json_object' },
          timeout: 25000 // 25s timeout for personalization
        }
      )

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content returned from AI')
      }

      // Parse and validate the AI response
      let parsed: DailyPlan
      try {
        const jsonResponse = JSON.parse(content)
        parsed = parseDailyPlan(jsonResponse)
      } catch (error) {
        console.error('AI returned invalid JSON or schema:', error, content)
        throw new Error('Invalid AI response format')
      }

      const latency = Date.now() - startTime

      // Track successful personalization
      trackEvent('personalization_success', {
        model_used: modelUsed,
        latency_ms: latency,
        user_identity: request.user_profile.identity,
        attachment_style: request.user_profile.attachment,
        quest_day: request.quest.day,
        version: request.version,
        tokens_used: response.usage?.total_tokens,
        copy_variant_id: request.user_profile.tone || 'default'
      })

      // Optionally emit plain-language content upstream
      if (request.plain_language !== false) {
        return this.mapPlan(parsed)
      }

      return parsed

    } catch (error) {
      const latency = Date.now() - startTime
      console.error('Personalization failed:', error)

      // Track personalization failure
      trackEvent('personalization_failed', {
        latency_ms: latency,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        user_identity: request.user_profile.identity,
        version: request.version,
        copy_variant_id: request.user_profile.tone || 'default'
      })

      // Return canonical fallback
      return this.createFallbackPlan(request)
    }
  }

  private buildSystemPrompt(): string {
    return `**System (Personalizer)**
You are the **Sparq Personalizer**. Adapt wording tenderly and playfully (when mode = Play), but never change therapeutic intent. No trauma/diagnosis. Output **ONLY JSON** matching \`DailyPlanSchema\`. If any constraint fails (unsafe topic, schema mismatch, token overrun), output the canonical fallback provided.

**Constraints**

* Temperature ≤ 0.3, max_tokens ≤ 320.
* Forbidden topic examples: trauma processing, abuse inventories, diagnoses.
* Use user IANA timezone date.`
  }

  private buildUserPrompt(request: PersonalizationRequest): string {
    const { canonical_day, user_profile, quest, recent, version, date } = request

    return JSON.stringify({
      CANONICAL_DAY: {
        story: canonical_day.story,
        dq: canonical_day.dq,
        micro_action: canonical_day.micro_action,
        journal: canonical_day.journal,
        reflection: canonical_day.reflection,
        tags: canonical_day.tags
      },
      USER_PROFILE: {
        identity: user_profile.identity,
        attachment: user_profile.attachment,
        love_languages: user_profile.love_languages,
        boundaries_comfort: user_profile.boundaries_comfort,
        time_pref: user_profile.time_pref,
        context: user_profile.context
      },
      QUEST: {
        id: quest.id,
        title: quest.title,
        day: quest.day
      },
      RECENT: {
        micro_done: recent.micro_done,
        streak: recent.streak
      },
      VERSION: version,
      SCHEMA: 'DailyPlanSchema',
      TARGET_DATE: date
    }, null, 2) + `

**Adaptation rules**

* If attachment=avoidant → emphasize autonomy/choice; short prompts; action first.
* If love language includes \`acts\` → offer action phrasing and practical suggestions.
* If tags mismatch with context → swap to alternative with intersecting tags.
* Appreciation templates ordered by top two Love Languages.

**Output JSON shape**: DailyPlanSchema with date="${date}", identity="${user_profile.identity}", version=${version}`
  }

  private createFallbackPlan(request: PersonalizationRequest): DailyPlan {
    const { canonical_day, user_profile, version, date } = request

    // Create minimal valid plan from canonical content
    const fallback: DailyPlan = {
      date,
      identity: user_profile.identity,
      story: canonical_day.story,
      dq: canonical_day.dq,
      micro_action: canonical_day.micro_action,
      journal: canonical_day.journal,
      reflection: canonical_day.reflection,
      appreciation_templates: this.getBasicAppreciationTemplates(user_profile.love_languages),
      tags: canonical_day.tags || [],
      version
    }

    trackEvent('personalization_fallback_used', {
      user_identity: user_profile.identity,
      version,
      date,
      copy_variant_id: user_profile.tone || 'default'
    })

    // Apply plain-language mapping if enabled
    if (request.plain_language !== false) {
      return this.mapPlan(fallback)
    }

    return fallback
  }

  private getBasicAppreciationTemplates(loveLanguages: string[]): string[] {
    const templates: Record<string, string> = {
      words: "I appreciate how you...",
      acts: "Thank you for doing...",
      time: "I loved spending time with you when...",
      gifts: "You surprised me with...",
      touch: "I felt so connected when you..."
    }

    // Use top 2 love languages for templates
    return loveLanguages.slice(0, 2).map(lang => templates[lang] || templates.words)
  }
}

// Helpers
export function mapString(s: string): string {
  return applyPlainLanguage(s, true)
}

export function mapArray(arr: string[]): string[] {
  return arr.map((s) => applyPlainLanguage(s, true))
}

export interface MappablePlan extends DailyPlan {}

export function isPlan(x: any): x is MappablePlan {
  return x && typeof x === 'object' && 'dq' in x && 'journal' in x
}

Personalizer.prototype.mapPlan = function(plan: DailyPlan): DailyPlan {
  if (!isPlan(plan)) return plan
  return {
    ...plan,
    story: mapString(plan.story),
    dq: mapString(plan.dq),
    micro_action: mapString(plan.micro_action),
    journal: mapString(plan.journal),
    reflection: mapString(plan.reflection),
    appreciation_templates: mapArray(plan.appreciation_templates || []),
  }
}

// Cache personalized plans to avoid redundant AI calls
const personalizationCache = new Map<string, { plan: DailyPlan; timestamp: number }>()
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

export function getCachedPersonalization(cacheKey: string): DailyPlan | null {
  const cached = personalizationCache.get(cacheKey)
  if (!cached) return null

  const isExpired = Date.now() - cached.timestamp > CACHE_TTL
  if (isExpired) {
    personalizationCache.delete(cacheKey)
    return null
  }

  trackEvent('personalization_cache_hit', { cache_key: cacheKey })
  return cached.plan
}

export function setCachedPersonalization(cacheKey: string, plan: DailyPlan): void {
  personalizationCache.set(cacheKey, {
    plan,
    timestamp: Date.now()
  })
  
  // Cleanup old entries periodically
  if (personalizationCache.size > 100) {
    const cutoff = Date.now() - CACHE_TTL
    for (const [key, value] of personalizationCache.entries()) {
      if (value.timestamp < cutoff) {
        personalizationCache.delete(key)
      }
    }
  }
}

// Singleton instance
let personalizer: Personalizer | null = null

export function getPersonalizer(): Personalizer {
  if (!personalizer) {
    personalizer = new Personalizer()
  }
  return personalizer
}
