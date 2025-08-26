'use client'

export default function ProgressRing() {
  const today = new Date().toISOString().slice(0,10)
  let count = 0
  try {
    const raw = localStorage.getItem(`progress:${today}`)
    count = Math.max(0, Math.min(7, parseInt(raw || '0', 10) || 0))
  } catch {}
  const pct = Math.round((count / 7) * 100)
  return (
    <div className="flex items-center gap-2">
      <svg width="36" height="36" viewBox="0 0 36 36" className="text-gray-200">
        <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="4" fill="none" />
        <circle cx="18" cy="18" r="16" stroke="#16a34a" strokeWidth="4" fill="none" strokeDasharray={`${pct} ${100-pct}`} strokeLinecap="round" />
      </svg>
      <span className="text-sm text-gray-600">{count}/7</span>
    </div>
  )
}

