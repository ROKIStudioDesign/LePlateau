'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOfficeStore } from '@/lib/store/office'
import type { AvatarPosition } from '@/lib/types/database'
import type { KnockNotification } from '@/lib/store/office'

// Shape broadcast by the knock channel
interface KnockPayload {
  id: string
  from_user_id: string
  from_display_name: string
  timestamp: number
}

export function usePresence(officeMapId: string): void {
  const setPositions = useOfficeStore((s) => s.setPositions)
  const setProfiles = useOfficeStore((s) => s.setProfiles)
  const updatePosition = useOfficeStore((s) => s.updatePosition)
  const removePosition = useOfficeStore((s) => s.removePosition)
  const addKnock = useOfficeStore((s) => s.addKnock)

  useEffect(() => {
    if (!officeMapId) return

    const supabase = createClient()
    let currentUserId: string | null = null

    // Track channel refs for cleanup
    let positionChannel: ReturnType<typeof supabase.channel> | null = null
    let knockChannel: ReturnType<typeof supabase.channel> | null = null

    async function bootstrap() {
      // ── 1. Get current user ───────────────────────────────────────────────
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return
      currentUserId = user.id

      // ── 2. Fetch all positions for this map ───────────────────────────────
      const { data: positions } = await supabase
        .from('avatar_positions')
        .select('*')
        .eq('office_map_id', officeMapId)

      if (positions) {
        setPositions(positions)
      }

      // ── 3. Fetch all profiles for the org ─────────────────────────────────
      // Get the user's org from their profile
      const { data: ownProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (ownProfile?.organization_id) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .eq('organization_id', ownProfile.organization_id)

        if (profiles) {
          setProfiles(profiles)
        }
      }

      // ── 4. Upsert own position as online ──────────────────────────────────
      await supabase.from('avatar_positions').upsert(
        {
          user_id: user.id,
          office_map_id: officeMapId,
          x: 100,
          y: 100,
          zone_id: null,
          is_online: true,
        },
        { onConflict: 'user_id,office_map_id' }
      )

      // ── 5. Subscribe to avatar_positions realtime ─────────────────────────
      positionChannel = supabase
        .channel(`avatar_positions:${officeMapId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'avatar_positions',
            filter: `office_map_id=eq.${officeMapId}`,
          },
          (payload) => {
            updatePosition(payload.new as AvatarPosition)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'avatar_positions',
            filter: `office_map_id=eq.${officeMapId}`,
          },
          (payload) => {
            updatePosition(payload.new as AvatarPosition)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'avatar_positions',
            filter: `office_map_id=eq.${officeMapId}`,
          },
          (payload) => {
            const old = payload.old as Partial<AvatarPosition>
            if (old.user_id) {
              removePosition(old.user_id)
            }
          }
        )
        .subscribe()

      // ── 6. Subscribe to knock broadcast channel ───────────────────────────
      knockChannel = supabase
        .channel(`knocks:${user.id}`)
        .on('broadcast', { event: 'knock' }, ({ payload }: { payload: KnockPayload }) => {
          const knock: KnockNotification = {
            id: payload.id,
            from_user_id: payload.from_user_id,
            from_display_name: payload.from_display_name,
            timestamp: payload.timestamp,
          }
          addKnock(knock)
        })
        .subscribe()
    }

    void bootstrap()

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      // Mark self as offline
      if (currentUserId) {
        void supabase
          .from('avatar_positions')
          .update({ is_online: false })
          .eq('user_id', currentUserId)
          .eq('office_map_id', officeMapId)
      }

      if (positionChannel) {
        void supabase.removeChannel(positionChannel)
      }
      if (knockChannel) {
        void supabase.removeChannel(knockChannel)
      }
    }
  }, [officeMapId, setPositions, setProfiles, updatePosition, removePosition, addKnock])
}
