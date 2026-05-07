'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types/database'

interface CurrentUserState {
  user: User | null
  profile: Profile | null
  loading: boolean
}

// Module-level cache — avoids re-fetching across component mounts in the same session
let cachedState: CurrentUserState | null = null

export default function useCurrentUser(): CurrentUserState {
  const [state, setState] = useState<CurrentUserState>(
    () => cachedState ?? { user: null, profile: null, loading: true }
  )

  useEffect(() => {
    // Return immediately if we already have a cached non-loading result
    if (cachedState && !cachedState.loading) {
      setState(cachedState)
      return
    }

    let cancelled = false
    const supabase = createClient()

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (cancelled) return

      if (!user) {
        const next: CurrentUserState = { user: null, profile: null, loading: false }
        cachedState = next
        setState(next)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (cancelled) return

      const next: CurrentUserState = {
        user,
        profile: profile ?? null,
        loading: false,
      }
      cachedState = next
      setState(next)
    }

    void load()

    // Listen for auth state changes to invalidate cache
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      cachedState = null
      if (!cancelled) {
        setState({ user: null, profile: null, loading: true })
        void load()
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return state
}
