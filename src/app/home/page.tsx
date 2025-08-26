import { getAuthContext } from '@/lib/guards'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import ProgressRing from '@/components/home/progress-ring'
import Button from '@/components/ui/button'
import { CoachMarks } from '@/components/ui/coach-marks'
import SessionEvents from '@/components/analytics/session-events'

const ENCOURAGEMENTS = [
  'Small kindness, big impact.',
  'Tiny steps build real warmth.',
  'You’re doing the caring thing.',
  'One gentle act goes far.',
  'Progress, not perfection.',
  'Warm moments, one at a time.',
  'A little care beats big talks.',
  'Consistency grows trust.',
  'A kind nudge helps.',
  'Show up small, feel big.',
  'You’re making space for care.',
  'Gentle is powerful.',
  'It all counts.',
  'Short and sweet works.',
  'Keep the spark going.',
  'Today’s a good day to care.',
  'Noticing changes things.',
  'Connection likes small moves.',
  'Be kind, be you.',
  'Two minutes is enough.'
]
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const { user, profile } = await getAuthContext('user_id,onboarded_at,attachment_tendencies,love_language_rank')
  if (!user) redirect('/auth')
  const bypass = process.env.NEXT_PUBLIC_BYPASS_ONBOARDING === '1' || process.env.NODE_ENV === 'development'
  if (!bypass && !profile?.onboarded_at) redirect('/onboarding')

  const supabase = await createClient()
  const { data: p } = await supabase
    .from('profiles')
    .select('full_name, current_identity')
    .eq('user_id', user.id)
    .single()
  const firstName = (p?.full_name || user.email || 'there').split(' ')[0]

  // Partner info
  const { data: pair } = await supabase
    .from('pairs')
    .select('user_a, user_b')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id})`)
    .limit(1)
    .maybeSingle()
  const hasPartner = !!pair
  const partnerName = '' // Simplified for now

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
      <div className="mx-auto p-6" style={{ maxWidth: 720 }}>
        <SessionEvents page="home" />
        <CoachMarks id="home" steps={[{ target: '#home-hero', text: 'Welcome! Sparq gives you one small ritual a day. Start here.' }]} />
        {/* Hero */}
        <section id="home-hero" className="bg-white border rounded-2xl shadow-sm p-6 mb-6">
          <div className="text-sm text-gray-500 mb-1">Hi, {firstName}</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{ENCOURAGEMENTS[(new Date().getDate()) % ENCOURAGEMENTS.length]}</h1>

          <div className="flex items-center gap-3 mb-4">
            {p?.current_identity && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-sm">{p.current_identity}</span>
            )}
            <div className="ml-auto">
              <ProgressRing />
            </div>
          </div>

          <div className="flex items-center justify-between">
            {hasPartner ? (
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-8 h-8 rounded-full bg-gray-200" aria-hidden />
                <span>{partnerName || 'Paired partner'}</span>
              </div>
            ) : (
              <Button as="a" href="/connections" variant="ghost" className="text-blue-600 hover:text-blue-800 text-sm font-medium px-0" onClick={() => trackEvent('nudge_click', { where: 'home_invite_partner' })}>Invite your partner</Button>
            )}
            <Button as="a" href="/today" onClick={() => trackEvent('nudge_click', { where: 'home_start_flow' })}>Start today’s 5-minute flow</Button>
          </div>
        </section>

        {/* Today summary */}
        <section className="grid gap-6">
          {!(profile?.attachment_tendencies || profile?.love_language_rank) && (
            <div className="bg-white border rounded-2xl shadow-sm p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Personalize Sparq?</h2>
                  <p className="text-gray-700">2–3 minutes. Tunes tone, timing, and tiny actions.</p>
                </div>
                <Link href="/personalize" className="ml-auto inline-flex items-center px-3 py-2 rounded-md bg-pink-600 text-white text-sm font-medium hover:bg-pink-700">Start</Link>
              </div>
              <div className="text-xs text-gray-500 mt-3">These are patterns, not diagnoses; adjust anytime.</div>
            </div>
          )}
          <div className="bg-white border rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Today</h2>
              <Button as="a" href="/today" variant="ghost" className="text-sm text-blue-600 hover:text-blue-800 px-0" onClick={() => trackEvent('nudge_click', { where: 'home_resume_flow' })}>Resume</Button>
            </div>
            <ul className="text-gray-700 space-y-1 text-[15px]">
              <li>⬜ How I’ll show up today</li>
              <li>⬜ 30-second reset</li>
              <li>⬜ Today’s connection question</li>
              <li>⬜ One tiny kind act</li>
              <li>⬜ Note to myself</li>
              <li>⬜ Say what you noticed</li>
              <li>⬜ What shifted today?</li>
            </ul>
          </div>

          <div className="bg-white border rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/today?say=1" className="px-3 py-2 rounded-md border text-gray-800 hover:bg-gray-50">Say what you noticed</Link>
              <Link href="/connections" className="px-3 py-2 rounded-md border text-gray-800 hover:bg-gray-50">Leave a note</Link>
              <Link href="/play" className="px-3 py-2 rounded-md border text-gray-800 hover:bg-gray-50">Play</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

// using redirect() for SSR navigation
