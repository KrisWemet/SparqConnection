'use client'

import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import Button from '@/components/ui/button'
import { getStreakManager } from '@/lib/streaks'
import { achievementManager } from '@/lib/achievements'
import HelpChip from '@/components/ui/help-chip'
import WhyHint from '@/components/ui/why-hint'
import { copy } from '@/content/copy/en-US'
import { useSupabase } from '@/components/providers/supabase-provider'
import AchievementCelebrationModal from '@/components/achievements/achievement-celebration-modal'

interface ReflectionCardProps {
  prompt: string
  onComplete?: () => void
  date?: string
  topLove?: string
}

export default function ReflectionCard({ prompt, onComplete, date, topLove }: ReflectionCardProps) {
  const { user } = useSupabase()
  const [reflection, setReflection] = useState('')
  const [moodRating, setMoodRating] = useState<number>(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState(prompt)
  const [variantId, setVariantId] = useState<string | null>(null)
  const [ifThen, setIfThen] = useState<{ if: string; then: string } | null>(null)
  
  // Load If–Then for today (local)
  useEffect(() => {
    try {
      if (!date) return
      const raw = localStorage.getItem(`ifthen:${date}`)
      if (raw) {
        const obj = JSON.parse(raw)
        if (obj?.if && obj?.then) setIfThen({ if: obj.if, then: obj.then })
      }
    } catch {}
  }, [date])

  // Load variant from content API (graceful fallback)
  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(`/api/content/cq-step?step_id=cq.reflection`, { signal: controller.signal })
        if (res.ok) {
          const data = await res.json()
          if (data?.text) setCurrentPrompt(data.text)
          if (data?.copy_variant_id) setVariantId(data.copy_variant_id)
        }
      } catch {}
    })()
    return () => controller.abort()
  }, [])
  const [streakUpdate, setStreakUpdate] = useState<any>(null)
  const [newAchievements, setNewAchievements] = useState<any[]>([])
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null)

  const moodOptions = [
    { value: 1, emoji: '😔', label: 'Disconnected' },
    { value: 2, emoji: '😐', label: 'Neutral' },
    { value: 3, emoji: '🙂', label: 'Good' },
    { value: 4, emoji: '😊', label: 'Connected' },
    { value: 5, emoji: '🥰', label: 'Amazing' }
  ]

  const handleComplete = async () => {
    setIsCompleted(true)
    trackEvent('reflection_logged', {
      has_text: reflection.length > 0,
      text_length: reflection.length,
      mood_rating: moodRating
    })
    trackEvent('cq_step_completed', {
      step_id: 'cq.reflection',
      copy_variant_id: variantId || 'base'
    })
    onComplete?.()

    // Update daily ritual streak and evaluate achievements
    if (user) {
      try {
        const streakManager = getStreakManager()
        const result = await streakManager.recordDailyRitual(user.id, 'reflection_completed')
        setStreakUpdate(result)
        
        // Evaluate achievements after completing reflection
        const achievementResult = await achievementManager.evaluateUserAchievements(user.id)
        if (achievementResult.success && achievementResult.new_achievements.length > 0) {
          setNewAchievements(achievementResult.new_achievements)
          // Show the first new achievement
          setSelectedAchievement(achievementResult.new_achievements[0])
        }
      } catch (error) {
        console.error('Error updating streak and achievements:', error)
      }
    }

    // TODO: Save reflection to database
    console.log('Saving reflection:', {
      reflection,
      moodRating,
      prompt
    })
  }

  if (isCompleted) {
    return (
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-gray-900">{copy.cards.reflect.title}</h2>
            <HelpChip title={copy.help.reflect.title} body={copy.help.reflect.body} eventName="help_opened_card_reflect" />
          </div>
          <div className="flex items-center">
            <div className="text-sm text-green-600 font-medium mr-2">✓ Complete</div>
            <div className="text-sm text-gray-500">7/7</div>
          </div>
        </div>

        <div className="text-center py-6">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🌟</span>
          </div>
          
          {topLove === 'time' ? (
            <>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nice work!</h3>
              <p className="text-gray-600 mb-4">Plan a 10‑minute micro‑moment tonight?</p>
              <button
                onClick={() => trackEvent('time_micro_moment_cta_click')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add a micro‑moment
              </button>
            </>
          ) : (
            <>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Ritual Complete!</h3>
              <p className="text-gray-600 mb-4">You&apos;ve finished today&apos;s connection ritual.</p>
            </>
          )}

          {/* Streak Update Celebration */}
          {streakUpdate && (
            <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg">
              {streakUpdate.achievement_earned ? (
                <div className="text-center">
                  <div className="text-2xl mb-2">🏆</div>
                  <div className="font-semibold text-green-900">Achievement Unlocked!</div>
                  <div className="text-sm text-green-800">{streakUpdate.achievement_data?.title}</div>
                </div>
              ) : streakUpdate.streak_reset ? (
                <div className="text-center">
                  <div className="text-xl mb-1">🌱</div>
                  <div className="text-sm text-green-800">{streakUpdate.message}</div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-xl mb-1">🔥</div>
                  <div className="text-sm text-green-800">
                    Daily streak: {streakUpdate.current_count} day{streakUpdate.current_count !== 1 ? 's' : ''}!
                  </div>
                </div>
              )}
            </div>
          )}

          {moodRating > 0 && (
            <div className="inline-flex items-center px-4 py-2 bg-gray-50 rounded-full">
              <span className="text-2xl mr-2">
                {moodOptions.find(m => m.value === moodRating)?.emoji}
              </span>
              <span className="text-sm font-medium text-gray-700">
                Feeling {moodOptions.find(m => m.value === moodRating)?.label.toLowerCase()}
              </span>
            </div>
          )}

          {reflection && (
            <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
              <p className="text-sm text-indigo-900 italic">
                &quot;{reflection.slice(0, 150)}{reflection.length > 150 ? '...' : ''}&quot;
              </p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-600">7</div>
              <div className="text-xs text-gray-500">Steps completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">1</div>
              <div className="text-xs text-gray-500">Day streak</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-pink-600">❤️</div>
              <div className="text-xs text-gray-500">Connection</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-gray-900">{copy.cards.reflect.title}</h2>
            <HelpChip title={copy.help.reflect.title} body={copy.help.reflect.body} eventName="help_opened_card_reflect" />
          </div>
          <div className="text-sm text-gray-500">7/7</div>
        </div>
        <p className="text-sm text-gray-600 mb-4">{copy.cards.reflect.subtitle}</p>

      {/* Prompt */}
      <div className="mb-6">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
          <p className="text-indigo-900 font-medium">
            {prompt}
          </p>
        </div>
        {ifThen && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-sm text-gray-800">
            <div className="mb-2"><span className="font-semibold">Your plan today:</span> If {ifThen.if} → then {ifThen.then}</div>
            <div className="flex gap-2">
              <button onClick={() => trackEvent('if_then_helpful', { value: 'yes' })} className="px-3 py-1 rounded-md border text-gray-800 hover:bg-gray-100">👍 Helped</button>
              <button onClick={() => trackEvent('if_then_helpful', { value: 'no' })} className="px-3 py-1 rounded-md border text-gray-800 hover:bg-gray-100">👎 Not today</button>
            </div>
          </div>
        )}
      </div>

      {/* Reflection Text */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Your reflection:
        </label>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Take a moment to reflect on today's ritual..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          rows={4}
        />
        <p className="text-xs text-gray-500 mt-1">
          Optional - even a few words help track your journey
        </p>
      </div>

      {/* Mood Rating */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-900 mb-3">
          How connected do you feel with your partner right now?
        </label>
        <div className="grid grid-cols-5 gap-2">
          {moodOptions.map((mood) => (
            <button
              key={mood.value}
              onClick={() => setMoodRating(mood.value)}
              className={`p-3 border rounded-lg text-center transition-colors ${
                moodRating === mood.value
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="text-2xl mb-1">{mood.emoji}</div>
              <div className="text-xs font-medium text-gray-700">
                {mood.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Complete Button */}
      <div className="space-y-4">
        <Button onClick={handleComplete} className="w-full">Complete Today&apos;s Ritual</Button>

        {/* Skip option */}
        <div className="text-center">
          <Button variant="ghost" onClick={handleComplete}>Complete without reflection</Button>
        </div>
      </div>

      <WhyHint text={copy.cards.reflect.why} />
      
      {/* Achievement Celebration Modal */}
      <AchievementCelebrationModal
        achievement={selectedAchievement}
        celebrationConfig={{ confetti: true, badge_animation: 'bounce', special_message: true }}
        isOpen={!!selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
      />
    </div>
  )
}
