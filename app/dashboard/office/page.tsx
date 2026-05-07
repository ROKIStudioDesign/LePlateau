"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile, OfficeMap, Zone } from "@/lib/types/database";
import { useOfficeStore } from "@/lib/store/office";
import { usePresence } from "@/hooks/use-presence";
import { useMSPresence } from "@/hooks/use-ms-presence";
import { useLiveKitAudio } from "@/hooks/use-livekit-audio";
import { LiveKitProvider } from "@/components/audio/livekit-provider";
import { AudioControls } from "@/components/audio/audio-controls";
import { ZoneDetailPanel } from "@/components/canvas/zone-detail-panel";
import { KnockToastContainer } from "@/components/canvas/knock-toast";
import { CanvasErrorBoundary } from "@/components/canvas/error-boundary";
import OfficeCanvasWrapper from "@/components/canvas/office-canvas-wrapper";
import { Map } from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// Inner component — all hooks live here (rules of hooks require unconditional calls)
// ──────────────────────────────────────────────────────────────────────────────

function OfficeInner({
  profile,
  officeMap,
}: {
  profile: Profile;
  officeMap: OfficeMap;
}) {
  const supabase = createClient();
  const { zones, currentZoneId, setCurrentZone } = useOfficeStore();
  const { speakingUserIds, roomName } = useLiveKitAudio(currentZoneId, zones);
  useMSPresence();

  const handleZoneEnter = useCallback(
    (zone: Zone) => {
      setCurrentZone(zone.id);
    },
    [setCurrentZone]
  );

  const handleAvatarClick = useCallback(
    async (targetUserId: string) => {
      const channel = supabase.channel(`knocks:${targetUserId}`);
      await channel.send({
        type: "broadcast",
        event: "knock",
        payload: {
          id: crypto.randomUUID(),
          from_user_id: profile.id,
          from_display_name: profile.display_name,
          timestamp: Date.now(),
        },
      });
    },
    [profile, supabase]
  );

  const handleAvatarMove = useCallback(
    async (x: number, y: number) => {
      const containingZone = zones.find(
        (z) =>
          x >= z.x &&
          x <= z.x + z.width &&
          y >= z.y &&
          y <= z.y + z.height
      );

      await supabase.from("avatar_positions").upsert({
        user_id: profile.id,
        office_map_id: officeMap.id,
        x,
        y,
        zone_id: containingZone?.id ?? null,
        is_online: true,
      });

      if (containingZone?.id !== currentZoneId) {
        setCurrentZone(containingZone?.id ?? null);
      }
    },
    [zones, currentZoneId, profile, officeMap, setCurrentZone, supabase]
  );

  const currentZone = zones.find((z) => z.id === currentZoneId) ?? null;

  return (
    <LiveKitProvider
      roomName={roomName}
      userId={profile.id}
      displayName={profile.display_name}
    >
      <div className="flex h-full">
        {/* Canvas area */}
        <div className="flex-1 relative overflow-hidden">
          <CanvasErrorBoundary>
            <OfficeCanvasWrapper
              officeMapId={officeMap.id}
              currentUserId={profile.id}
              currentUserProfile={profile}
              onZoneEnter={handleZoneEnter}
              onAvatarMove={handleAvatarMove}
              onAvatarClick={handleAvatarClick}
              speakingUserIds={speakingUserIds}
            />
          </CanvasErrorBoundary>

          {/* Audio controls */}
          <AudioControls
            currentZoneName={currentZone?.name}
            speakingUserIds={speakingUserIds}
          />
        </div>

        {/* Zone detail panel */}
        <ZoneDetailPanel
          onZoneEnter={handleZoneEnter}
          currentUserId={profile.id}
        />
      </div>

      {/* Knock notifications */}
      <KnockToastContainer
        onAcceptKnock={(fromUserId) => {
          const knockerPos = useOfficeStore.getState().positions.get(fromUserId);
          if (knockerPos?.zone_id) {
            setCurrentZone(knockerPos.zone_id);
          }
        }}
      />
    </LiveKitProvider>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page — bootstraps data, renders correct state
// ──────────────────────────────────────────────────────────────────────────────

type LoadState = "loading" | "ready" | "no-map" | "no-org";

export default function OfficePage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [officeMap, setOfficeMap] = useState<OfficeMap | null>(null);

  const { setZones } = useOfficeStore();

  useEffect(() => {
    async function bootstrap() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profileData?.organization_id) {
        setLoadState("no-org");
        return;
      }
      setProfile(profileData);

      const { data: mapData } = await supabase
        .from("office_maps")
        .select("*")
        .eq("organization_id", profileData.organization_id)
        .order("created_at")
        .limit(1)
        .single();

      if (!mapData) {
        setLoadState("no-map");
        return;
      }
      setOfficeMap(mapData);

      const { data: zonesData } = await supabase
        .from("zones")
        .select("*")
        .eq("office_map_id", mapData.id)
        .order("created_at");

      setZones(zonesData ?? []);
      setLoadState("ready");
    }

    void bootstrap();
  }, [setZones]);

  // Wire presence once we have a map (empty string = skip)
  usePresence(officeMap?.id ?? "");

  if (loadState === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin mx-auto" />
          <p className="text-[#64748B] text-sm">Chargement du bureau…</p>
        </div>
      </div>
    );
  }

  if (loadState === "no-org") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6">
        <Map size={40} className="text-[#64748B]" />
        <div>
          <p className="text-lg font-semibold text-[#F1F5F9]">
            Aucune organisation trouvée
          </p>
          <p className="mt-1 text-sm text-[#64748B]">
            Vous n&apos;êtes rattaché à aucune organisation.
          </p>
        </div>
        <Link
          href="/onboarding"
          className="px-4 py-2 rounded-lg bg-[#6366F1] text-white text-sm font-medium hover:bg-[#5254cc] transition-colors"
        >
          Créer une organisation →
        </Link>
      </div>
    );
  }

  if (loadState === "no-map") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6">
        <Map size={40} className="text-[#64748B]" />
        <div>
          <p className="text-lg font-semibold text-[#F1F5F9]">
            Bureau non configuré
          </p>
          <p className="mt-1 text-sm text-[#64748B] max-w-sm">
            Aucune carte de bureau n&apos;a encore été créée pour votre
            organisation.
          </p>
        </div>
        <Link
          href="/onboarding"
          className="px-4 py-2 rounded-lg bg-[#6366F1] text-white text-sm font-medium hover:bg-[#5254cc] transition-colors"
        >
          Configurer le bureau →
        </Link>
      </div>
    );
  }

  // loadState === "ready"
  return <OfficeInner profile={profile!} officeMap={officeMap!} />;
}
