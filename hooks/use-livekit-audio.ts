'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { RoomEvent, Track, type Participant } from "livekit-client";
import { useLiveKitContext } from "@/components/audio/livekit-provider";
import { useOfficeStore } from "@/lib/store/office";
import type { Zone } from "@/lib/types/database";

export interface UseLiveKitAudioResult {
  roomName: string | null;
  isMuted: boolean;
  toggleMute: () => Promise<void>;
  speakingUserIds: Set<string>;
}

export function useLiveKitAudio(
  currentZoneId: string | null,
  zones: Zone[]
): UseLiveKitAudioResult {
  const { room } = useLiveKitContext();
  const [isMuted, setIsMuted] = useState(true);
  const [speakingUserIds, setSpeakingUserIds] = useState<Set<string>>(
    new Set()
  );

  const positions = useOfficeStore((s) => s.positions);

  // Derive the room name from the current zone id
  const currentZone = currentZoneId
    ? zones.find((z) => z.id === currentZoneId) ?? null
    : null;
  const roomName = currentZone ? currentZone.id : null;

  // ----------------------------------------------------------------
  // Sync isMuted state from room's local participant
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!room) {
      setIsMuted(true);
      return;
    }

    const syncMute = (): void => {
      const pub = room.localParticipant.getTrackPublication(
        Track.Source.Microphone
      );
      setIsMuted(pub?.isMuted ?? true);
    };

    syncMute();
    room.localParticipant.on("trackMuted", syncMute);
    room.localParticipant.on("trackUnmuted", syncMute);

    return () => {
      room.localParticipant.off("trackMuted", syncMute);
      room.localParticipant.off("trackUnmuted", syncMute);
    };
  }, [room]);

  // ----------------------------------------------------------------
  // Auto-mute on zone entry when zone.auto_mute is true
  // ----------------------------------------------------------------
  const prevZoneIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!room || !currentZone) {
      prevZoneIdRef.current = currentZoneId;
      return;
    }

    const zoneChanged = currentZoneId !== prevZoneIdRef.current;
    prevZoneIdRef.current = currentZoneId;

    if (zoneChanged && currentZone.auto_mute) {
      room.localParticipant
        .setMicrophoneEnabled(false)
        .catch((err: unknown) =>
          console.error("[useLiveKitAudio] auto-mute error:", err)
        );
    }
  }, [room, currentZoneId, currentZone]);

  // ----------------------------------------------------------------
  // Track active speakers (updates speakingUserIds)
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!room) {
      setSpeakingUserIds(new Set());
      return;
    }

    const handleActiveSpeakers = (speakers: Participant[]): void => {
      const ids = new Set(speakers.map((p) => p.identity));
      // Also include local participant if they are speaking
      if (room.localParticipant.isSpeaking) {
        ids.add(room.localParticipant.identity);
      }
      setSpeakingUserIds(ids);
    };

    room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakers);

    return () => {
      room.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakers);
    };
  }, [room]);

  // ----------------------------------------------------------------
  // Distance-based volume for open_space zones
  // ----------------------------------------------------------------
  const myUserId = room?.localParticipant.identity ?? null;

  useEffect(() => {
    if (!room || !currentZone || currentZone.type !== "open_space") return;

    const intervalId = setInterval(() => {
      const myPosition = myUserId ? positions.get(myUserId) : null;
      if (!myPosition) return;

      room.remoteParticipants.forEach((participant) => {
        const theirPosition = positions.get(participant.identity);
        if (!theirPosition) return;

        const dx = myPosition.x - theirPosition.x;
        const dy = myPosition.y - theirPosition.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const MAX_DIST = 300;
        const volume = dist >= MAX_DIST ? 0 : 1 - dist / MAX_DIST;

        participant.setVolume(volume);
      });
    }, 500);

    return () => clearInterval(intervalId);
  }, [room, currentZone, positions, myUserId]);

  // ----------------------------------------------------------------
  // toggleMute
  // ----------------------------------------------------------------
  const toggleMute = useCallback(async (): Promise<void> => {
    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(isMuted);
    } catch (err) {
      console.error("[useLiveKitAudio] toggleMute error:", err);
    }
  }, [room, isMuted]);

  return {
    roomName,
    isMuted,
    toggleMute,
    speakingUserIds,
  };
}
