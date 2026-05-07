'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Room, RoomEvent } from "livekit-client";

interface LiveKitContextValue {
  room: Room | null;
}

const LiveKitContext = createContext<LiveKitContextValue>({ room: null });

export function useLiveKitContext(): LiveKitContextValue {
  return useContext(LiveKitContext);
}

interface LiveKitProviderProps {
  roomName: string | null;
  userId: string;
  displayName: string;
  children: React.ReactNode;
  onSpeakingChange?: (userIds: Set<string>) => void;
}

export function LiveKitProvider({
  roomName,
  userId,
  displayName,
  children,
  onSpeakingChange,
}: LiveKitProviderProps): React.JSX.Element {
  const [room, setRoom] = useState<Room | null>(null);
  // Keep a stable ref to the current room so async callbacks can access it
  const roomRef = useRef<Room | null>(null);
  const onSpeakingChangeRef = useRef(onSpeakingChange);
  onSpeakingChangeRef.current = onSpeakingChange;

  useEffect(() => {
    if (!roomName) {
      // Disconnect from any existing room when roomName becomes null
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
        setRoom(null);
      }
      return;
    }

    let cancelled = false;

    async function connect(): Promise<void> {
      // Disconnect from the previous room before connecting to a new one
      if (roomRef.current) {
        await roomRef.current.disconnect();
        roomRef.current = null;
        if (!cancelled) setRoom(null);
      }

      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName, userId, displayName }),
        });

        if (!res.ok) {
          console.error("[LiveKitProvider] Failed to fetch token:", res.status);
          return;
        }

        const data = (await res.json()) as { token: string };

        if (cancelled) return;

        const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
        if (!livekitUrl) {
          console.error("[LiveKitProvider] NEXT_PUBLIC_LIVEKIT_URL is not set");
          return;
        }

        const newRoom = new Room();

        newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          const ids = new Set(speakers.map((p) => p.identity));
          onSpeakingChangeRef.current?.(ids);
        });

        await newRoom.connect(livekitUrl, data.token);

        if (cancelled) {
          await newRoom.disconnect();
          return;
        }

        roomRef.current = newRoom;
        setRoom(newRoom);
      } catch (err) {
        if (!cancelled) {
          console.error("[LiveKitProvider] Connection error:", err);
        }
      }
    }

    void connect();

    return () => {
      cancelled = true;
    };
  }, [roomName, userId, displayName]);

  // Disconnect on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []);

  return (
    <LiveKitContext.Provider value={{ room }}>
      {children}
    </LiveKitContext.Provider>
  );
}
