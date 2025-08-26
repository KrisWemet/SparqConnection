'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

export default function SessionEvents({ page }: { page: 'home' | 'today' }) {
  useEffect(() => {
    const now = Date.now()
    const last = parseInt(localStorage.getItem('last_seen') || '0', 10)
    const sevenDays = 7 * 24 * 60 * 60 * 1000

    trackEvent('session_open', { page })

    // If we have a last_seen timestamp within the last 7 days (and at least 24h ago), mark return-in-7d
    if (last > 0) {
      const since = now - last
      if (since > 24 * 60 * 60 * 1000 && since <= sevenDays) {
        trackEvent('session_return_in_7d', { page })
      }
    }

    localStorage.setItem('last_seen', String(now))
  }, [page])

  return null
}

