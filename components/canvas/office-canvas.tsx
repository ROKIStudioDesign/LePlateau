'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Line, Rect, Text, Group } from 'react-konva';
import Konva from 'konva';
import { useOfficeStore } from '@/lib/store/office';
import { ZONE_ACCENT_COLORS } from '@/lib/canvas/layouts';
import type { Zone, AvatarPosition, Profile, WorkScheduleStatus, Decoration } from '@/lib/types/database';

// ─── Public prop types ────────────────────────────────────────────────────────

export interface OfficeCanvasProps {
  officeMapId: string;
  currentUserId: string;
  currentUserProfile: Profile;
  onZoneEnter: (zone: Zone) => void;
  onAvatarMove: (x: number, y: number) => void;
  onAvatarClick?: (userId: string) => void;
  speakingUserIds: Set<string>;
  workSchedules?: Map<string, WorkScheduleStatus>;
  bookedZoneIds?: Set<string>;
  decorations?: Decoration[];
}

// ─── Isometric math ───────────────────────────────────────────────────────────

const TILE_W = 64;
const TILE_H = 32;
const GRID_SIZE = 20;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;

function toIso(x: number, y: number) {
  return {
    sx: (x - y) * (TILE_W / 2),
    sy: (x + y) * (TILE_H / 2),
  };
}

// Flat-canvas pixel coords → iso grid tile coords
function zoneToGrid(zone: Zone) {
  return {
    gx: Math.max(0, Math.round(zone.x / TILE_W)),
    gy: Math.max(0, Math.round(zone.y / TILE_W)),
    gw: Math.max(2, Math.round(zone.width / TILE_W)),
    gh: Math.max(2, Math.round(zone.height / TILE_W)),
  };
}

// Clockwise diamond points for tile at (gx, gy)
function tileDiamond(gx: number, gy: number): number[] {
  const T = toIso(gx, gy);
  const R = toIso(gx + 1, gy);
  const B = toIso(gx + 1, gy + 1);
  const L = toIso(gx, gy + 1);
  return [T.sx, T.sy, R.sx, R.sy, B.sx, B.sy, L.sx, L.sy];
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Camera ───────────────────────────────────────────────────────────────────

function computeFitCamera(zones: Zone[], width: number, height: number) {
  let minSx = Infinity, maxSx = -Infinity;
  let minSy = Infinity, maxSy = -Infinity;

  function expand(gx: number, gy: number, gw: number, gh: number) {
    for (const [cx, cy] of [
      [gx, gy], [gx + gw, gy], [gx + gw, gy + gh], [gx, gy + gh],
    ] as [number, number][]) {
      const iso = toIso(cx, cy);
      minSx = Math.min(minSx, iso.sx);
      maxSx = Math.max(maxSx, iso.sx);
      minSy = Math.min(minSy, iso.sy);
      maxSy = Math.max(maxSy, iso.sy);
    }
  }

  if (zones.length > 0) {
    for (const z of zones) {
      const { gx, gy, gw, gh } = zoneToGrid(z);
      expand(gx, gy, gw, gh);
    }
    // add breathing room around zones
    minSx -= TILE_W * 2; maxSx += TILE_W * 2;
    minSy -= TILE_H * 3; maxSy += TILE_H * 3;
  } else {
    expand(0, 0, GRID_SIZE, GRID_SIZE);
  }

  const isoW = maxSx - minSx;
  const isoH = maxSy - minSy;
  if (isoW <= 0 || isoH <= 0) return { x: width / 2, y: height / 2, scale: 1 };

  const padding = 64;
  const scale = Math.min(
    Math.max((width - padding * 2) / isoW, MIN_SCALE),
    MAX_SCALE
  );
  return {
    x: width / 2 - (minSx + isoW / 2) * scale,
    y: height / 2 - (minSy + isoH / 2) * scale,
    scale,
  };
}

// ─── Main canvas ──────────────────────────────────────────────────────────────

export default function OfficeCanvas({
  onZoneEnter: _onZoneEnter,
  onAvatarMove: _onAvatarMove,
  onAvatarClick: _onAvatarClick,
  speakingUserIds: _speakingUserIds,
  workSchedules: _workSchedules,
  bookedZoneIds: _bookedZoneIds,
  decorations: _decorations,
}: OfficeCanvasProps) {
  const { zones, camera, setCamera } = useOfficeStore();
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const fitDone = useRef(false);

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) setDimensions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit camera to zones on first valid render
  useEffect(() => {
    if (fitDone.current || dimensions.width < 100) return;
    const cam = computeFitCamera(zones, dimensions.width, dimensions.height);
    setCamera(cam);
    fitDone.current = true;
  }, [dimensions, zones, setCamera]);

  // Sync Zustand camera → Konva Stage imperatively (avoids re-render on every wheel tick)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.x(camera.x);
    stage.y(camera.y);
    stage.scaleX(camera.scale);
    stage.scaleY(camera.scale);
    stage.batchDraw();
  }, [camera]);

  // Per-tile zone color map
  const tileColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const zone of zones) {
      const { gx, gy, gw, gh } = zoneToGrid(zone);
      const color = ZONE_ACCENT_COLORS[zone.type] ?? '#5B5BD6';
      for (let i = gx; i < gx + gw; i++) {
        for (let j = gy; j < gy + gh; j++) {
          map.set(`${i},${j}`, color);
        }
      }
    }
    return map;
  }, [zones]);

  // Floor tiles (400 diamonds)
  const tiles = useMemo(() => {
    const result: React.ReactElement[] = [];
    for (let gy = 0; gy < GRID_SIZE; gy++) {
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const color = tileColorMap.get(`${gx},${gy}`);
        result.push(
          <Line
            key={`${gx},${gy}`}
            points={tileDiamond(gx, gy)}
            closed
            fill={color ? hexToRgba(color, 0.15) : '#F0F0F2'}
            stroke="#E4E4E7"
            strokeWidth={0.5}
            listening={false}
          />
        );
      }
    }
    return result;
  }, [tileColorMap]);

  // Zone outlines + name labels
  const zoneOverlays = useMemo(() => {
    return zones.map((zone) => {
      const { gx, gy, gw, gh } = zoneToGrid(zone);
      const color = ZONE_ACCENT_COLORS[zone.type] ?? '#5B5BD6';

      const T = toIso(gx, gy);
      const R = toIso(gx + gw, gy);
      const B = toIso(gx + gw, gy + gh);
      const L = toIso(gx, gy + gh);

      // Label sits above the top edge midpoint
      const mid = toIso(gx + gw / 2, gy);
      const LW = 110, LH = 22;
      const lx = mid.sx - LW / 2;
      const ly = mid.sy - LH - 10;

      return (
        <Group key={zone.id} listening={false}>
          {/* Zone boundary parallelogram */}
          <Line
            points={[T.sx, T.sy, R.sx, R.sy, B.sx, B.sy, L.sx, L.sy]}
            closed
            fill="transparent"
            stroke={color}
            strokeWidth={3}
          />
          {/* Label background */}
          <Rect
            x={lx}
            y={ly}
            width={LW}
            height={LH}
            fill="white"
            cornerRadius={4}
            shadowColor="rgba(0,0,0,0.10)"
            shadowBlur={6}
            shadowOffsetY={2}
            shadowEnabled
          />
          {/* Label text */}
          <Text
            x={lx}
            y={ly}
            width={LW}
            height={LH}
            text={zone.name}
            fontSize={12}
            fontFamily="'DM Sans', sans-serif"
            fill="#0A0A0B"
            align="center"
            verticalAlign="middle"
          />
        </Group>
      );
    });
  }, [zones]);

  // ─── Camera event handlers ────────────────────────────────────────────────

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const anchor = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const dir = e.evt.deltaY < 0 ? 1 : -1;
    const factor = 1.08;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * (dir > 0 ? factor : 1 / factor)));
    const newPos = {
      x: pointer.x - anchor.x * newScale,
      y: pointer.y - anchor.y * newScale,
    };

    stage.scaleX(newScale);
    stage.scaleY(newScale);
    stage.x(newPos.x);
    stage.y(newPos.y);
    stage.batchDraw();
    setCamera({ x: newPos.x, y: newPos.y, scale: newScale });
  }, [setCamera]);

  const handleDragStart = useCallback(() => {
    const container = stageRef.current?.container();
    if (container) container.style.cursor = 'grabbing';
  }, []);

  const handleDragEnd = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const container = stage.container();
    if (container) container.style.cursor = 'grab';
    setCamera({ x: stage.x(), y: stage.y(), scale: stage.scaleX() });
  }, [setCamera]);

  const handleDblClick = useCallback(() => {
    const cam = computeFitCamera(zones, dimensions.width, dimensions.height);
    setCamera(cam);
  }, [zones, dimensions, setCamera]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background: 'var(--bg-secondary)', cursor: 'grab' }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable
        onWheel={handleWheel}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDblClick={handleDblClick}
      >
        {/* Layer 1 — floor tiles */}
        <Layer listening={false}>
          {tiles}
        </Layer>

        {/* Layer 2 — zone boundaries + labels */}
        <Layer listening={false}>
          {zoneOverlays}
        </Layer>
      </Stage>
    </div>
  );
}
