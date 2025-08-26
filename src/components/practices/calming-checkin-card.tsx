'use client'

import PracticeConsentCard from './practice-consent-card'

export default function CalmingCheckInCard({ date }: { date?: string }) {
  return (
    <PracticeConsentCard id="calm" title="Calming check‑in" minutes="2–3 min" date={date}>
      <ol className="list-decimal list-inside text-sm text-gray-800 space-y-2">
        <li>Sit comfortably if you choose. Notice one inhale and one exhale.</li>
        <li>If it helps, gently lengthen the exhale by a second or two.</li>
        <li>Silently name one feeling (e.g., “tense”) and one need (e.g., “space”).</li>
        <li>Pick one tiny way to show up (e.g., “I’ll speak a bit slower”).</li>
      </ol>
    </PracticeConsentCard>
  )
}

