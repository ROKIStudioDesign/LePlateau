'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TeamsStatus } from '@/lib/types/database'

interface MSGraphPresenceResponse {
  status: TeamsStatus
}

interface UseMSPresenceResult {
  teamsStatus: TeamsStatus
}

const POLL_INTERVAL_MS = 60_000

export function useMSPresence(): UseMSPresenceResult {
  const [teamsStatus, setTeamsStatus] = useState<TeamsStatus>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch('/api/ms-graph/presence', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!res.ok || cancelled) return

        const data = (await res.json()) as MSGraphPresenceResponse

        if (cancelled) return

        const status = data.status ?? null
        setTeamsStatus(status)

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user || cancelled) return

        await supabase
          .from('profiles')
          .update({ teams_status: status })
          .eq('id', user.id)
      } catch {
        // silently ignore — MS token may not be available yet for all users
      }
    }

    // Initial poll
    void poll()

    // Schedule subsequent polls
    intervalRef.current = setInterval(() => {
      void poll()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  return { teamsStatus }
}
