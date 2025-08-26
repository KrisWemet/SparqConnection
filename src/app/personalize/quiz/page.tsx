'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { t } from '@/lib/i18n'

type AttachmentPrimary = 'secure' | 'anxious' | 'avoidant' | 'mixed'
type LoveLanguage = 'words' | 'acts' | 'time' | 'touch' | 'gifts'

export default function PersonalizeQuiz() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Attachment micro‑quiz: choose what feels most true across 4 items
  const [answers, setAnswers] = useState<Record<string, AttachmentPrimary | null>>({
    closeness: null,
    during_conflict: null,
    after_distance: null,
    repair_style: null,
  })

  // Love language ranking (simple top 5 ordering via clicks)
  const [order, setOrder] = useState<LoveLanguage[]>(['words','acts','time','touch','gifts'])

  // Partner sharing
  const [shareTips, setShareTips] = useState(true)
  const [shareLabels, setShareLabels] = useState(false)

  useEffect(() => { trackEvent('quiz_start') }, [])

  const attachmentDistribution = useMemo(() => {
    // naive scoring: count selections; secure gets small baseline weight
    const scores: Record<AttachmentPrimary, number> = { secure: 1, anxious: 0, avoidant: 0, mixed: 0 }
    Object.values(answers).forEach((a) => { if (a) scores[a] += 1 })
    const total = Object.values(scores).reduce((s, v) => s + v, 0) || 1
    const dist = Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Math.round((v / total) * 100)])) as Record<AttachmentPrimary, number>
    const primary = (Object.entries(dist).sort((a,b) => b[1]-a[1])[0]?.[0] || 'secure') as AttachmentPrimary
    const confidence = Math.max(0.5, (Object.values(dist).sort((a,b)=>b-a)[0] || 50) / 100)
    return { distribution: dist, primary, confidence }
  }, [answers])

  const topTwo = useMemo(() => order.slice(0,2), [order])

  async function submit() {
    try {
      const res = await fetch('/api/user/personalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachment_tendencies: attachmentDistribution,
          love_language_rank: { order, top: topTwo, confidence: 0.6 },
          share_with_partner: { show_tips: shareTips, show_labels: shareLabels }
        })
      })
      if (!res.ok) throw new Error('Save failed')

      trackEvent('quiz_complete')
      trackEvent('attachment_primary', { value: attachmentDistribution.primary })
      trackEvent('ll_primary', { value: topTwo[0] })
      router.replace('/home')
    } catch (e) {
      alert('Sorry — something went wrong saving your answers.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Attachment tendencies</h1>
              <p className="text-gray-700 mb-4">Trends, not boxes. Pick what feels most true.</p>

              <QuizQuestion
                id="closeness"
                prompt="When things are good, I feel most at ease when..."
                options={{
                  secure: 'we both can be close or independent freely',
                  anxious: 'we stay closely connected and check in often',
                  avoidant: 'we enjoy time together and plenty of solo space',
                  mixed: 'it really depends on the week'
                }}
                value={answers.closeness}
                onChange={(v) => setAnswers(a => ({ ...a, closeness: v }))}
              />

              <QuizQuestion
                id="during_conflict"
                prompt="In a tense moment, I tend to..."
                options={{
                  secure: 'name how I feel and listen back',
                  anxious: 'seek reassurance and clarity right away',
                  avoidant: 'take space to think before talking',
                  mixed: 'ping-pong between talking a lot and shutting down'
                }}
                value={answers.during_conflict}
                onChange={(v) => setAnswers(a => ({ ...a, during_conflict: v }))}
              />

              <QuizQuestion
                id="after_distance"
                prompt="After we haven’t connected in a bit, I often..."
                options={{
                  secure: 'reconnect with ease',
                  anxious: 'worry what it means and seek contact',
                  avoidant: 'feel relief and take longer to re-engage',
                  mixed: 'feel both relief and worry'
                }}
                value={answers.after_distance}
                onChange={(v) => setAnswers(a => ({ ...a, after_distance: v }))}
              />

              <QuizQuestion
                id="repair_style"
                prompt="Repair feels easiest when..."
                options={{
                  secure: 'we both share and own our part',
                  anxious: 'I’m clearly reassured and we set a plan',
                  avoidant: 'we slow down, set structure, and get space',
                  mixed: 'we keep it short and try again later'
                }}
                value={answers.repair_style}
                onChange={(v) => setAnswers(a => ({ ...a, repair_style: v }))}
              />

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(2)} className="flex-1 bg-pink-600 text-white py-3 rounded-md font-medium hover:bg-pink-700">Next</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Love language preferences</h1>
              <p className="text-gray-700 mb-4">Tap to move your top choices up.</p>

              <div className="space-y-2">
                {order.map((ll) => (
                  <RankRow key={ll} label={labelFor(ll)} onUp={() => move(ll, -1)} onDown={() => move(ll, 1)} />
                ))}
              </div>
              <div className="text-sm text-gray-600 mt-3">Top two: <strong>{labelFor(order[0])}</strong> and <strong>{labelFor(order[1])}</strong></div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="flex-1 border py-3 rounded-md font-medium text-gray-800 hover:bg-gray-50">Back</button>
                <button onClick={() => setStep(3)} className="flex-1 bg-pink-600 text-white py-3 rounded-md font-medium hover:bg-pink-700">Next</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Sharing preferences</h1>
              <p className="text-gray-700 mb-4">Choose what’s visible to your partner. You can change anytime.</p>

              <label className="flex items-center gap-3 mb-3">
                <input type="checkbox" checked={shareTips} onChange={(e) => setShareTips(e.target.checked)} />
                <span>{t('personalize.share.tips')}</span>
              </label>
              <label className="flex items-center gap-3 mb-6">
                <input type="checkbox" checked={shareLabels} onChange={(e) => setShareLabels(e.target.checked)} />
                <span>{t('personalize.share.labels')}</span>
              </label>

              <div className="text-xs text-gray-500 mb-4">Privacy: we never reveal a label your partner didn’t choose to share.</div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 border py-3 rounded-md font-medium text-gray-800 hover:bg-gray-50">{t('common.back') || 'Back'}</button>
                <button onClick={submit} className="flex-1 bg-pink-600 text-white py-3 rounded-md font-medium hover:bg-pink-700">{t('common.save') || 'Save'}</button>
              </div>
              <div className="mt-3 text-sm">
                <a className="text-blue-600 hover:text-blue-800 underline" onClick={() => alert(t('personalize.options'))}>{t('personalize.options')}</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  function move(ll: LoveLanguage, delta: number) {
    const idx = order.indexOf(ll)
    const target = idx + delta
    if (target < 0 || target >= order.length) return
    const arr = order.slice()
    const [item] = arr.splice(idx, 1)
    arr.splice(target, 0, item)
    setOrder(arr)
  }
}

function labelFor(ll: LoveLanguage) {
  switch (ll) {
    case 'words': return 'Words of Affirmation'
    case 'acts': return 'Acts of Service'
    case 'time': return 'Quality Time'
    case 'touch': return 'Physical Touch'
    case 'gifts': return 'Gifts'
  }
}

function RankRow({ label, onUp, onDown }: { label: string, onUp: () => void, onDown: () => void }) {
  return (
    <div className="flex items-center justify-between border rounded-md px-3 py-2">
      <span className="text-gray-900">{label}</span>
      <div className="flex gap-2">
        <button type="button" onClick={onUp} className="px-2 py-1 border rounded-md text-sm">↑</button>
        <button type="button" onClick={onDown} className="px-2 py-1 border rounded-md text-sm">↓</button>
      </div>
    </div>
  )
}

function QuizQuestion({ id, prompt, options, value, onChange }: {
  id: string,
  prompt: string,
  options: Record<AttachmentPrimary, string>,
  value: AttachmentPrimary | null,
  onChange: (v: AttachmentPrimary) => void
}) {
  return (
    <fieldset className="mb-4">
      <legend className="mb-2 text-gray-900 font-semibold text-base">{prompt}</legend>
      <div className="space-y-2">
        {Object.entries(options).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 border rounded-md px-3 py-2 cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name={id}
              value={key}
              checked={value === key}
              onChange={() => onChange(key as AttachmentPrimary)}
            />
            <span className="text-gray-800">{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
