import { getAuthContext } from '@/lib/guards'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const sp = await searchParams
  const { user, profile } = await getAuthContext('user_id,onboarded_at,time_preference,tone_preference,appreciation_channel,settings')
  if (!user) redirect('/auth')
  if (profile?.onboarded_at) redirect('/home')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-6">
        <header className="py-6">
          <Link href="/" className="text-gray-700">← Back</Link>
        </header>
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Make it your style</h1>
          <p className="text-gray-700 mb-6">60 seconds to personalize your 5‑minute flow.</p>

          <OnboardingForm 
            defaultTime={profile?.time_preference || profile?.settings?.time_preference || ''}
            defaultTone={profile?.tone_preference || profile?.settings?.tone_preference || ''}
            defaultChannel={profile?.appreciation_channel || profile?.settings?.appreciation_channel || ''}
            hasError={sp?.error == '1'}
          />
        </div>
      </div>
    </div>
  )
}

function OnboardingForm({ defaultTime, defaultTone, defaultChannel, hasError }: { defaultTime?: string; defaultTone?: string; defaultChannel?: string; hasError?: boolean }) {
  // Server Component form; use plain HTML form + accessible segmented controls
  const url = '/api/user/onboard'
  return (
    <form action={url} method="post" className="space-y-6">
      {/* Q1 */}
      <fieldset>
        <legend className="mb-2 text-gray-900 font-semibold text-base">When should we nudge you?</legend>
        <div className="inline-flex rounded-lg border border-gray-500 overflow-hidden" role="radiogroup" aria-label="When should we nudge you?">
          {[
            { label: 'Morning', value: 'morning' },
            { label: 'Evening', value: 'evening' },
          ].map((opt, idx) => (
            <label key={opt.value} className={`${idx>0 ? 'border-l border-gray-500' : ''}`}>
              <input 
                type="radio" 
                name="time_preference" 
                value={opt.value} 
                defaultChecked={defaultTime === opt.value}
                className="sr-only peer" 
                required
              />
              <span className="block px-4 py-2 text-[16px] font-medium select-none cursor-pointer text-gray-900 bg-white peer-checked:bg-gray-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600">{opt.label}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-700">You can change this later.</p>
      </fieldset>

      {/* Q2 */}
      <fieldset>
        <legend className="mb-2 text-gray-900 font-semibold text-base">What tone feels right?</legend>
        <div className="inline-flex rounded-lg border border-gray-500 overflow-hidden" role="radiogroup" aria-label="What tone feels right?">
          {[
            { label: 'Fun', value: 'fun' },
            { label: 'Gentle', value: 'gentle' },
          ].map((opt, idx) => (
            <label key={opt.value} className={`${idx>0 ? 'border-l border-gray-500' : ''}`}>
              <input 
                type="radio" 
                name="tone_preference" 
                value={opt.value} 
                defaultChecked={defaultTone === opt.value}
                className="sr-only peer" 
                required
              />
              <span className="block px-4 py-2 text-[16px] font-medium select-none cursor-pointer text-gray-900 bg-white peer-checked:bg-gray-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600">{opt.label}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-700">You can change this later.</p>
      </fieldset>

      {/* Q3 */}
      <fieldset>
        <legend className="mb-2 text-gray-900 font-semibold text-base">How do you prefer to share appreciation?</legend>
        <div className="inline-flex rounded-lg border border-gray-500 overflow-hidden" role="radiogroup" aria-label="How do you prefer to share appreciation?">
          {[
            { label: 'Write it', value: 'text' },
            { label: 'In person', value: 'in_person' },
          ].map((opt, idx) => (
            <label key={opt.value} className={`${idx>0 ? 'border-l border-gray-500' : ''}`}>
              <input 
                type="radio" 
                name="appreciation_channel" 
                value={opt.value}
                defaultChecked={(defaultChannel === opt.value) || (defaultChannel === 'in-person' && opt.value === 'in_person')}
                className="sr-only peer" 
                required
              />
              <span className="block px-4 py-2 text-[16px] font-medium select-none cursor-pointer text-gray-900 bg-white peer-checked:bg-gray-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600">{opt.label}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-700">We'll personalize your daily prompts based on this.</p>
      </fieldset>

      <button type="submit" className="w-full bg-pink-600 text-white py-3 rounded-md font-medium hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-600">
        Continue
      </button>
      {hasError && (
        <p className="text-red-600 text-sm mt-2" role="alert">Please select an option for each question.</p>
      )}
    </form>
  )
}
