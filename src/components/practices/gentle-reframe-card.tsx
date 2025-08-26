'use client'

import PracticeConsentCard from './practice-consent-card'

export default function GentleReframeCard({ date }: { date?: string }) {
  return (
    <PracticeConsentCard id="reframe" title="Gentle reframe" minutes="3–4 min" date={date}>
      <ol className="list-decimal list-inside text-sm text-gray-800 space-y-2">
        <li>Notice a repeating thought (e.g., “They don’t care”).</li>
        <li>Ask: “What else might be true?” (e.g., “They’re tired,” “They missed it”).</li>
        <li>Choose one balanced alternative and try: “Another possibility is…”</li>
        <li>Pick one tiny action aligned with that view (e.g., ask a curious question).</li>
      </ol>
    </PracticeConsentCard>
  )
}

