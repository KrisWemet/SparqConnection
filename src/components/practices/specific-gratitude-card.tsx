'use client'

import PracticeConsentCard from './practice-consent-card'

export default function SpecificGratitudeCard({ date }: { date?: string }) {
  return (
    <PracticeConsentCard id="gratitude" title="Specific gratitude" minutes="2–3 min" date={date}>
      <ol className="list-decimal list-inside text-sm text-gray-800 space-y-2">
        <li>Recall one small action you appreciated (time/place).</li>
        <li>Name how it helped you or the day.</li>
        <li>Draft one sentence: “When you [specific], it helped me [impact].”</li>
      </ol>
    </PracticeConsentCard>
  )
}

