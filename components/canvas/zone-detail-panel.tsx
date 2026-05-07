'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useOfficeStore } from '@/lib/store/office';
import { cn, getInitials } from '@/lib/utils';
import { getStatusColor, getStatusLabel } from '@/lib/ms-graph/presence';
import type { TeamsStatus, Zone } from '@/lib/types/database';
import { ZONE_ICONS, ZONE_ACCENT_COLORS } from '@/lib/canvas/layouts';
import { X, Mic, MicOff, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ZoneDetailPanelProps {
  onZoneEnter: (zone: Zone) => void;
  currentUserId: string;
}

// ---------------------------------------------------------------------------
// Zone type → badge variant mapping
// ---------------------------------------------------------------------------

const ZONE_TYPE_LABELS: Record<string, string> = {
  open_space: 'Open Space',
  meeting_room: 'Salle de réunion',
  focus: 'Focus',
  social: 'Social',
  break: 'Pause',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ZoneDetailPanel({ onZoneEnter, currentUserId }: ZoneDetailPanelProps) {
  const { selectedZoneId, zones, positions, profiles, setSelectedZone } =
    useOfficeStore();

  const supabase = createClient();

  const zone = zones.find((z) => z.id === selectedZoneId);
  const occupants = zone
    ? Array.from(positions.values()).filter(
        (p) => p.zone_id === zone.id && p.is_online
      )
    : [];

  const othersInZone = occupants.filter((p) => p.user_id !== currentUserId);

  async function handleKnock(targetUserId: string) {
    const myProfile = profiles.get(currentUserId);
    if (!myProfile) return;
    // Broadcast to the target user's personal channel.
    const channel = supabase.channel(`knocks:${targetUserId}`);
    await channel.send({
      type: 'broadcast',
      event: 'knock',
      payload: {
        id: crypto.randomUUID(),
        from_user_id: currentUserId,
        from_display_name: myProfile.display_name,
        timestamp: Date.now(),
      },
    });
  }

  return (
    <AnimatePresence>
      {zone && (
        <motion.aside
          key={zone.id}
          initial={{ x: 280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 280, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex w-[280px] shrink-0 flex-col border-l border-[#1E1E2E] bg-[#13131A]"
          aria-label="Détail de la zone"
        >
          {/* ----------------------------------------------------------------
           * Header
           * -------------------------------------------------------------- */}
          <div className="flex items-start justify-between border-b border-[#1E1E2E] px-4 py-4">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl leading-none" aria-hidden="true">
                {ZONE_ICONS[zone.type]}
              </span>
              <div>
                <h3 className="text-sm font-semibold leading-tight text-[#F1F5F9]">
                  {zone.name}
                </h3>
                <Badge variant="muted" className="mt-0.5 text-[10px]">
                  {ZONE_TYPE_LABELS[zone.type] ?? zone.type}
                </Badge>
              </div>
            </div>
            <button
              onClick={() => setSelectedZone(null)}
              className="rounded p-1 text-[#64748B] transition-colors hover:bg-[#1E1E2E] hover:text-[#F1F5F9]"
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          </div>

          {/* ----------------------------------------------------------------
           * Action buttons
           * -------------------------------------------------------------- */}
          <div className="space-y-2 border-b border-[#1E1E2E] px-4 py-3">
            <button
              className="w-full flex items-center justify-center gap-2 h-9 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              onClick={() => onZoneEnter(zone)}
              style={{
                background: `linear-gradient(135deg, ${ZONE_ACCENT_COLORS[zone.type] ?? '#6366F1'}cc, ${ZONE_ACCENT_COLORS[zone.type] ?? '#6366F1'}80)`,
                boxShadow: `0 0 12px ${ZONE_ACCENT_COLORS[zone.type] ?? '#6366F1'}40`,
              }}
            >
              <Mic size={14} />
              Rejoindre
            </button>

            {othersInZone.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  // Knock everyone else in the zone.
                  othersInZone.forEach((p) => handleKnock(p.user_id));
                }}
              >
                {/* Door-knock icon: we use a doorbell-style emoji inline since
                    lucide-react 0.400 has no "knock" icon. */}
                <span aria-hidden="true" className="text-base leading-none">🚪</span>
                Frapper à la porte
              </Button>
            )}
          </div>

          {/* ----------------------------------------------------------------
           * Occupants list
           * -------------------------------------------------------------- */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#64748B]">
              <Users size={11} />
              Personnes dans cette zone
              <span className="ml-auto font-normal tabular-nums">
                {occupants.length}
                {zone.max_capacity != null ? ` / ${zone.max_capacity}` : ''}
              </span>
            </p>

            {occupants.length === 0 ? (
              <p className="py-4 text-center text-xs text-[#64748B]">
                Personne ici pour l&apos;instant
              </p>
            ) : (
              <ul className="space-y-1">
                {occupants.map((pos) => {
                  const profile = profiles.get(pos.user_id);
                  if (!profile) return null;

                  const sColor = getStatusColor(
                    profile.teams_status as TeamsStatus
                  );
                  const sLabel = getStatusLabel(
                    profile.teams_status as TeamsStatus
                  );
                  const isMe = pos.user_id === currentUserId;

                  return (
                    <li
                      key={pos.user_id}
                      className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
                    >
                      {/* Avatar */}
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white"
                        style={{
                          background: `hsl(${Math.abs(
                            pos.user_id
                              .split('')
                              .reduce(
                                (acc, c) =>
                                  (acc << 5) - acc + c.charCodeAt(0),
                                0
                              )
                          ) % 360}, 60%, 45%)`,
                          boxShadow: `0 0 0 2px ${sColor}`,
                        }}
                      >
                        {profile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(profile.display_name)
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[#F1F5F9]">
                          {profile.display_name}
                          {isMe && (
                            <span className="ml-1 text-[#64748B]">(vous)</span>
                          )}
                        </p>
                        <p className="text-xs" style={{ color: sColor }}>
                          {sLabel}
                        </p>
                      </div>

                      {/* Per-user knock button */}
                      {!isMe && (
                        <button
                          onClick={() => handleKnock(pos.user_id)}
                          className={cn(
                            'rounded p-1 text-sm text-[#64748B] transition-all',
                            'opacity-0 group-hover:opacity-100',
                            'hover:bg-[#1E1E2E] hover:text-[#F1F5F9]'
                          )}
                          aria-label={`Frapper à la porte de ${profile.display_name}`}
                          title="Frapper"
                        >
                          🚪
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ----------------------------------------------------------------
           * Zone metadata footer
           * -------------------------------------------------------------- */}
          {(zone.auto_mute || zone.max_capacity != null) && (
            <div className="space-y-1.5 border-t border-[#1E1E2E] px-4 py-3">
              {zone.auto_mute && (
                <p className="flex items-center gap-2 text-xs text-[#64748B]">
                  <MicOff size={11} className="shrink-0 text-amber-400" />
                  Micro coupé à l&apos;entrée
                </p>
              )}
              {zone.max_capacity != null && (
                <p className="flex items-center gap-2 text-xs text-[#64748B]">
                  <Users size={11} className="shrink-0 text-[#6366F1]" />
                  Capacité max&nbsp;: {zone.max_capacity}
                </p>
              )}
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
