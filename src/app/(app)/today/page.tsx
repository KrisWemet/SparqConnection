'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { DailyPlan } from '@/lib/schemas'
import { trackEvent } from '@/lib/analytics'
import { copy } from '@/content/copy/en-US'

// Import components (we'll create these next)
import IdentityCard from '@/components/today/identity-card'
import CenterMeCard from '@/components/today/center-me-card'
import DailyQuestionCard from '@/components/today/daily-question-card'
import MicroActionCard from '@/components/today/micro-action-card'
import JournalCard from '@/components/today/journal-card'
import AppreciationCard from '@/components/today/appreciation-card'
import ReflectionCard from '@/components/today/reflection-card'
import IfThenBuilder from '@/components/today/if-then-builder'
import CalmingCheckInCard from '@/components/practices/calming-checkin-card'
import GentleReframeCard from '@/components/practices/gentle-reframe-card'
import SpecificGratitudeCard from '@/components/practices/specific-gratitude-card'
import { CoachMarks } from '@/components/ui/coach-marks'
import SessionEvents from '@/components/analytics/session-events'

export default function TodayPage() {
  const { user, loading } = useSupabase()
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState<number>(1) // Identity preselected
  const [prefersSpace, setPrefersSpace] = useState<boolean>(false)
  const [benefitsReassurance, setBenefitsReassurance] = useState<boolean>(false)
  const [topLove, setTopLove] = useState<string | null>(null)

  const markComplete = () => setCompleted((c) => Math.min(c + 1, 7))

  useEffect(() => {
    if (loading) return

    if (!user) {
      // Redirect to auth
      window.location.href = '/auth'
      return
    }

    // Gate: First-run tour
    const tour = window.localStorage.getItem('tourCompleted')
    if (!tour) {
      trackEvent('tour_gate_redirected')
      window.location.href = '/tour'
      return
    }

    const fetchTodayPlan = async () => {
      try {
        const response = await fetch('/api/daily/today')
        if (!response.ok) {
          throw new Error('Failed to fetch today&apos;s plan')
        }
        const plan = await response.json()
        setDailyPlan(plan)
        
        // Track page view
        trackEvent('today_opened', {
          source: plan.source || 'unknown',
          version: plan.version
        })
      } catch (err) {
        console.error('Error fetching today plan:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTodayPlan()

    // Deep link: focus Say it card
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('say') == '1') {
        setTimeout(() => {
          document.getElementById('say-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 300)
      }
    } catch {}

    // Load saved progress for the day
    try {
      const key = `progress:${new Date().toISOString().slice(0,10)}`
      const raw = localStorage.getItem(key)
      if (raw) setCompleted(Math.max(1, Math.min(7, parseInt(raw, 10) || 1)))
    } catch {}

    // Fetch personalization flags (copy_profile + top love language)
    ;(async () => {
      try {
        const res = await fetch('/api/user/personalization')
        if (res.ok) {
          const data = await res.json()
          const cp = data.copy_profile || {}
          setPrefersSpace(!!cp.prefers_space)
          setBenefitsReassurance(!!cp.benefits_reassurance)
          const llTop = data?.love_language_rank?.top?.[0] || data?.love_language_rank?.order?.[0] || null
          setTopLove(llTop)
        }
      } catch {}
    })()
  }, [user, loading])

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your daily ritual...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!dailyPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No content available</h2>
          <p className="text-gray-600">Please try again later.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <SessionEvents page="today" />
      {/* Stepper header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-2 flex items-center gap-2">
          {[1,2,3,4,5,6,7].map((i) => (
            <div key={i} className={`h-2 flex-1 rounded-full ${i <= completed ? 'bg-green-600' : 'bg-gray-200'}`} />
          ))}
          <span className="ml-2 text-sm text-gray-600">{completed}/7</span>
        </div>
      </div>
      <CoachMarks id="today" steps={[
        { target: '#identity-card', text: 'Pick how you want to show up today. Tiny, doable.' },
        { target: '#dq-card', text: 'One simple question to understand each other better.' },
        { target: '#journal-card', text: 'Private by default. Your entries are encrypted.' },
      ]} />
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">✨ Sparq</h1>
            <div className="flex space-x-4">
              <a
                href="/play"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Play
              </a>
              <a
                href="/connections"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Connections
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto pt-8 pb-12 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{copy.cards.dq.title.replace('connection question', '5-minute flow')}</h1>
          <p className="text-gray-600">{dailyPlan.date}</p>
        </div>

        {/* Today Flow Cards - Fixed Order */}
        <div className="space-y-6">
          {/* Optional pre‑flow practices */}
          <CalmingCheckInCard date={dailyPlan.date} />
          <GentleReframeCard date={dailyPlan.date} />
          <SpecificGratitudeCard date={dailyPlan.date} />
          <IdentityCard id="identity-card" 
            identity={dailyPlan.identity} 
          />

          {/* If–Then builder */}
          <IfThenBuilder date={dailyPlan.date} onSaved={() => setCompleted((c)=>Math.max(c,2))} />
          
          <CenterMeCard onComplete={() => { markComplete(); persistProgress() }} />
          
          <DailyQuestionCard onComplete={() => { markComplete(); persistProgress() }} id="dq-card" 
            question={dailyPlan.dq}
            tags={dailyPlan.tags}
            date={dailyPlan.date}
            benefitsReassurance={benefitsReassurance}
            prefersSpace={prefersSpace}
            topLove={topLove || undefined}
          />
          
          <MicroActionCard onComplete={() => { markComplete(); persistProgress() }} 
            action={dailyPlan.micro_action}
          />
          
          <JournalCard onComplete={() => { markComplete(); persistProgress() }} id="journal-card" 
            prompt={dailyPlan.journal}
          />
          
          <AppreciationCard onComplete={() => { markComplete(); persistProgress() }} 
            templates={dailyPlan.appreciation_templates}
          />
          
          <ReflectionCard onComplete={() => { markComplete(); persistProgress() }} 
            prompt={dailyPlan.reflection}
            date={dailyPlan.date}
            topLove={topLove || undefined}
          />
        </div>

        {/* Progress Summary */}
        <div className="mt-8 p-4 bg-white rounded-lg border">
          <h3 className="font-semibold text-gray-900 mb-2">Today&apos;s Progress</h3>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full w-0" id="progress-bar"></div>
            </div>
            <span className="text-sm text-gray-600" id="progress-text">0/7</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function persistProgress() {
  try {
    const key = `progress:${new Date().toISOString().slice(0,10)}`
    const count = document.querySelectorAll('.bg-green-600.h-2').length || 0
    localStorage.setItem(key, String(Math.max(1, Math.min(7, count))))
  } catch {}
}
