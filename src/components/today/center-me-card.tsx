'use client'

import { useState, useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import Button from '@/components/ui/button'
import HelpChip from '@/components/ui/help-chip'
import WhyHint from '@/components/ui/why-hint'
import { copy } from '@/content/copy/en-US'

export default function CenterMeCard({ onComplete }: { onComplete?: () => void }) {
  const [isStarted, setIsStarted] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [countdown, setCountdown] = useState(30) // 30 seconds for demo
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale' | 'pause'>('pause')

  useEffect(() => {
    if (!isStarted || isCompleted) return

    if (countdown <= 0) {
      setIsCompleted(true)
      trackEvent('center_completed', { duration: 30 })
      onComplete?.()
      return
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
      
      // Simple breathing pattern: 4 in, 6 out
      const cycle = (30 - countdown) % 10
      if (cycle < 4) {
        setBreathPhase('inhale')
      } else {
        setBreathPhase('exhale')
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, isStarted, isCompleted])

  const handleStart = () => {
    setIsStarted(true)
    trackEvent('center_started')
  }

  const handleSkip = () => {
    setIsCompleted(true)
    trackEvent('center_skipped')
    onComplete?.()
  }

  if (isCompleted) {
    return (
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-gray-900">{copy.cards.reset.title}</h2>
            <HelpChip title={copy.help.reset.title} body={copy.help.reset.body} eventName="help_opened_card_reset" />
          </div>
          <div className="flex items-center">
            <div className="text-sm text-green-600 font-medium mr-2">✓ Complete</div>
            <div className="text-sm text-gray-500">2/7</div>
          </div>
        </div>

        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="text-2xl">🌱</div>
          </div>
          <p className="text-gray-600">Nice work taking a moment to center yourself.</p>
          <p className="text-sm text-gray-500 mt-2">How do you feel now?</p>
        </div>
      </div>
    )
  }

  if (isStarted) {
    return (
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-gray-900">{copy.cards.reset.title}</h2>
            <HelpChip title={copy.help.reset.title} body={copy.help.reset.body} eventName="help_opened_card_reset" />
          </div>
          <div className="text-sm text-gray-500">2/7</div>
        </div>

        <div className="text-center py-8">
          {/* Breathing Circle */}
          <div className={`w-24 h-24 mx-auto mb-6 rounded-full border-4 transition-all duration-1000 ${
            breathPhase === 'inhale' 
              ? 'border-blue-400 scale-110 bg-blue-50' 
              : 'border-blue-200 scale-100 bg-blue-25'
          }`}>
            <div className="flex items-center justify-center h-full">
              <span className="text-2xl">🌬️</span>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-lg font-medium text-gray-900 capitalize">
              {breathPhase === 'pause' ? 'Breathe naturally' : breathPhase}
            </p>
            <p className="text-sm text-gray-600">
              {breathPhase === 'inhale' ? 'Breathe in slowly for 4' : 
               breathPhase === 'exhale' ? 'Breathe out gently for 6' : 
               'Find your natural rhythm'}
            </p>
          </div>

          <div className="text-2xl font-bold text-blue-600 mb-4">
            {countdown}s
          </div>

          <p className="text-sm text-gray-500">{copy.cards.reset.subtitle}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-6 border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-900">{copy.cards.reset.title}</h2>
          <HelpChip title={copy.help.reset.title} body={copy.help.reset.body} eventName="help_opened_card_reset" />
        </div>
        <div className="text-sm text-gray-500">2/7</div>
      </div>
      <p className="text-sm text-gray-600 mb-4">{copy.cards.reset.subtitle}</p>

      <div className="mb-6" />

      <div className="flex space-x-3">
        <Button onClick={handleStart} className="flex-1">Start Centering</Button>
        <Button variant="outline" onClick={handleSkip}>Skip</Button>
      </div>
    </div>
  )
}
