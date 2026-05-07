'use client';

import React, { useCallback, useEffect, useState } from "react";
import { Track } from "livekit-client";
import { useLiveKitContext } from "./livekit-provider";
import { cn } from "@/lib/utils";

interface AudioControlsProps {
  currentZoneName?: string;
  speakingUserIds?: Set<string>;
}

export function AudioControls({
  currentZoneName,
  speakingUserIds,
}: AudioControlsProps): React.JSX.Element {
  const { room } = useLiveKitContext();
  const [isMuted, setIsMuted] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Keep local mute state in sync with room
  useEffect(() => {
    if (!room) return;

    const micPub = room.localParticipant.getTrackPublication(
      Track.Source.Microphone
    );
    setIsMuted(micPub?.isMuted ?? true);

    function handleMuteChanged(): void {
      if (!room) return;
      const pub = room.localParticipant.getTrackPublication(
        Track.Source.Microphone
      );
      setIsMuted(pub?.isMuted ?? true);
    }

    room.localParticipant.on("trackMuted", handleMuteChanged);
    room.localParticipant.on("trackUnmuted", handleMuteChanged);

    return () => {
      room.localParticipant.off("trackMuted", handleMuteChanged);
      room.localParticipant.off("trackUnmuted", handleMuteChanged);
    };
  }, [room]);

  // Track local participant speaking state from active speakers list
  useEffect(() => {
    if (!room) {
      setIsSpeaking(false);
      return;
    }

    const localIdentity = room.localParticipant.identity;
    setIsSpeaking(speakingUserIds?.has(localIdentity) ?? false);
  }, [room, speakingUserIds]);

  const toggleMic = useCallback(async (): Promise<void> => {
    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(isMuted);
    } catch (err) {
      console.error("[AudioControls] Failed to toggle microphone:", err);
    }
  }, [room, isMuted]);

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-3 px-4 py-2 rounded-full"
      )}
      style={{
        background: 'rgba(13,13,20,0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Microphone toggle */}
      <button
        onClick={() => void toggleMic()}
        disabled={!room}
        aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
        className={cn(
          "relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          isMuted
            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            : isSpeaking
            ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
            : "bg-emerald-500/10 text-emerald-400/60 hover:bg-emerald-500/20"
        )}
      >
        {/* Speaking pulse ring */}
        {isSpeaking && !isMuted && (
          <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
        )}
        {isMuted ? (
          // Mic-off icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="2" y1="2" x2="22" y2="22" />
            <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
            <path d="M5 10v2a7 7 0 0 0 12 5" />
            <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        ) : (
          // Mic-on icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        )}
      </button>

      {/* Current zone name pill */}
      {currentZoneName && (
        <span className="text-xs text-white/70 font-medium whitespace-nowrap max-w-[120px] truncate">
          {currentZoneName}
        </span>
      )}

      {/* Volume / speaking indicator: 3 animated bars */}
      <div
        className="flex items-end gap-[2px] h-4"
        aria-label={isSpeaking ? "Speaking" : "Silent"}
      >
        {([0, 1, 2] as const).map((i) => (
          <span
            key={i}
            className={cn(
              "w-[3px] rounded-full transition-all duration-150",
              isSpeaking
                ? "bg-green-400"
                : "bg-white/20"
            )}
            style={{
              height: isSpeaking
                ? `${[55, 100, 70][i]}%`
                : "30%",
              animation: isSpeaking
                ? `speakingBar${i} 0.6s ease-in-out infinite alternate`
                : "none",
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes speakingBar0 {
          from { height: 30%; }
          to   { height: 80%; }
        }
        @keyframes speakingBar1 {
          from { height: 50%; }
          to   { height: 100%; }
        }
        @keyframes speakingBar2 {
          from { height: 40%; }
          to   { height: 70%; }
        }
      `}</style>
    </div>
  );
}
