import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { AvatarPosition, Profile, Zone } from "@/lib/types/database";

export interface KnockNotification {
  id: string;
  from_user_id: string;
  from_display_name: string;
  timestamp: number;
}

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

interface OfficeState {
  positions: Map<string, AvatarPosition>;
  profiles: Map<string, Profile>;
  zones: Zone[];
  currentZoneId: string | null;
  selectedZoneId: string | null;
  rightPanelOpen: boolean;
  knockNotifications: KnockNotification[];
  camera: Camera;

  setPositions: (positions: AvatarPosition[]) => void;
  updatePosition: (position: AvatarPosition) => void;
  removePosition: (userId: string) => void;
  setProfiles: (profiles: Profile[]) => void;
  setZones: (zones: Zone[]) => void;
  setCurrentZone: (zoneId: string | null) => void;
  setSelectedZone: (zoneId: string | null) => void;
  toggleRightPanel: () => void;
  addKnock: (knock: KnockNotification) => void;
  dismissKnock: (id: string) => void;
  setCamera: (camera: Camera) => void;
}

export const useOfficeStore = create<OfficeState>()(
  subscribeWithSelector((set) => ({
    positions: new Map(),
    profiles: new Map(),
    zones: [],
    currentZoneId: null,
    selectedZoneId: null,
    rightPanelOpen: true,
    knockNotifications: [],
    camera: { x: 0, y: 0, scale: 1 },

    setPositions: (positions) =>
      set({
        positions: new Map(positions.map((p) => [p.user_id, p])),
      }),

    updatePosition: (position) =>
      set((state) => {
        const next = new Map(state.positions);
        next.set(position.user_id, position);
        return { positions: next };
      }),

    removePosition: (userId) =>
      set((state) => {
        const next = new Map(state.positions);
        next.delete(userId);
        return { positions: next };
      }),

    setProfiles: (profiles) =>
      set({ profiles: new Map(profiles.map((p) => [p.id, p])) }),

    setZones: (zones) => set({ zones }),

    setCurrentZone: (zoneId) => set({ currentZoneId: zoneId }),

    setSelectedZone: (zoneId) =>
      set({ selectedZoneId: zoneId, rightPanelOpen: zoneId !== null }),

    toggleRightPanel: () =>
      set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),

    addKnock: (knock) =>
      set((state) => ({
        knockNotifications: [knock, ...state.knockNotifications].slice(0, 5),
      })),

    dismissKnock: (id) =>
      set((state) => ({
        knockNotifications: state.knockNotifications.filter((k) => k.id !== id),
      })),

    setCamera: (camera) => set({ camera }),
  }))
);
