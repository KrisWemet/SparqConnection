'use client'

import { useEffect, useState } from 'react'
import { copy } from '@/content/copy/en-US'
import { trackEvent } from '@/lib/analytics'

type Slide = {
  title?: string
  body?: string
  cta?: string
  ctaSolo?: string
  ctaInvite?: string
}

const slides: Slide[] = [
  copy.tour.s1,
  copy.tour.s2,
  copy.tour.s3,
  copy.tour.s4,
  copy.tour.s5,
  copy.tour.s6,
]

export default function TourPage() {
  const [i, setI] = useState(0)
  const [timePref, setTimePref] = useState<'morning'|'evening'>('morning')
  const [tone, setTone] = useState<'fun'|'gentle'>('fun')
  const [thanksMode, setThanksMode] = useState<'text'|'voice'|'in-person'>('text')

  useEffect(() => {
    trackEvent('tour_started')
  }, [])

  const next = () => setI((p) => Math.min(p + 1, slides.length - 1))
  const prev = () => setI((p) => Math.max(p - 1, 0))

  const finish = async () => {
    try {
      window.localStorage.setItem('tourCompleted', 'true')
      window.localStorage.setItem('plainLanguage', 'true')
      window.localStorage.setItem('timePref', timePref)
      window.localStorage.setItem('tone', tone)
      window.localStorage.setItem('thanksMode', thanksMode)
      await fetch('/api/user/tour-complete', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timePref, tone, thanksMode })
      })
    } catch {}
    trackEvent('tour_completed')
    window.location.href = '/today'
  }

  const s = slides[i]

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6 border border-gray-100">
        <div className="mb-4 text-sm text-gray-500">Step {i + 1} of {slides.length}</div>
        {s.title && (
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{s.title}</h1>
        )}
        {s.body && (
          <p className="text-gray-700 mb-6 leading-relaxed">{s.body}</p>
        )}

        {/* Controls */}
        <div className="space-y-3">
          {i === 0 && (
            <button onClick={next} className="w-full bg-pink-600 text-white py-3 rounded-md font-medium hover:bg-pink-700">
              {copy.tour.s1.cta}
            </button>
          )}

          {i === 3 && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={next} className="bg-gray-900 text-white py-3 rounded-md font-medium hover:bg-black">{copy.tour.s4.ctaSolo}</button>
              <button onClick={next} className="bg-white border border-gray-300 py-3 rounded-md font-medium hover:bg-gray-50">{copy.tour.s4.ctaInvite}</button>
            </div>
          )}

          {i === 4 && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-900 mb-2">When would you like your prompt?</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setTimePref('morning')} className={`py-2 rounded border ${timePref==='morning'?'border-gray-900':'border-gray-300'}`}>Morning</button>
                  <button onClick={() => setTimePref('evening')} className={`py-2 rounded border ${timePref==='evening'?'border-gray-900':'border-gray-300'}`}>Evening</button>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 mb-2">What vibe do you prefer?</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setTone('fun')} className={`py-2 rounded border ${tone==='fun'?'border-gray-900':'border-gray-300'}`}>Fun</button>
                  <button onClick={() => setTone('gentle')} className={`py-2 rounded border ${tone==='gentle'?'border-gray-900':'border-gray-300'}`}>Gentle</button>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 mb-2">How do you like to appreciate?</div>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setThanksMode('text')} className={`py-2 rounded border ${thanksMode==='text'?'border-gray-900':'border-gray-300'}`}>Text</button>
                  <button onClick={() => setThanksMode('voice')} className={`py-2 rounded border ${thanksMode==='voice'?'border-gray-900':'border-gray-300'}`}>Voice</button>
                  <button onClick={() => setThanksMode('in-person')} className={`py-2 rounded border ${thanksMode==='in-person'?'border-gray-900':'border-gray-300'}`}>In-person</button>
                </div>
              </div>
            </div>
          )}

          {i === slides.length - 1 && (
            <button onClick={finish} className="w-full bg-indigo-600 text-white py-3 rounded-md font-medium hover:bg-indigo-700">
              {copy.tour.s6.cta}
            </button>
          )}

          {i > 0 && i < slides.length - 1 && (
            <button onClick={next} className="w-full bg-gray-900 text-white py-3 rounded-md font-medium hover:bg-black">Continue</button>
          )}

          {/* Nav */}
          <div className="flex justify-between items-center text-sm text-gray-500">
            <button onClick={prev} disabled={i === 0} className="disabled:opacity-50">Back</button>
            <button onClick={finish} className="underline">Skip</button>
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center mt-5 space-x-1">
          {slides.map((_, idx) => (
            <div key={idx} className={`w-2 h-2 rounded-full ${idx === i ? 'bg-gray-900' : 'bg-gray-300'}`}></div>
          ))}
        </div>
      </div>
    </div>
  )
}
