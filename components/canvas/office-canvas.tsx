'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { Stage, Layer, Rect, Circle, Text, Group } from 'react-konva';
import Konva from 'konva';
import { useOfficeStore } from '@/lib/store/office';
import { ZONE_ICONS, ZONE_ACCENT_COLORS } from '@/lib/canvas/layouts';
import { cn, debounce } from '@/lib/utils';
import type { Zone, AvatarPosition, Profile } from '@/lib/types/database';

// ---------------------------------------------------------------------------
// Public prop types
// ---------------------------------------------------------------------------

export interface OfficeCanvasProps {
  officeMapId: string;
  currentUserId: string;
  currentUserProfile: Profile;
  onZoneEnter: (zone: Zone) => void;
  onAvatarMove: (x: number, y: number) => void;
  onAvatarClick?: (userId: string) => void;
  speakingUserIds: Set<string>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface TooltipState {
  visible: boolean;
  /** Stage-relative X (we convert to page coords when rendering) */
  pageX: number;
  pageY: number;
  zoneId: string;
}

function hashColor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h << 5) - h + userId.charCodeAt(i);
    h |= 0;
  }
  return `hsl(${Math.abs(h) % 360}, 60%, 55%)`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function statusColor(status: string | null): string {
  switch (status) {
    case 'Available':
      return '#22C55E';
    case 'Busy':
    case 'InACall':
    case 'InAMeeting':
    case 'DoNotDisturb':
      return '#EF4444';
    case 'Away':
    case 'BeRightBack':
      return '#EAB308';
    default:
      return '#6B7280';
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------------------------------------------------------------------
// ZoneShape
// ---------------------------------------------------------------------------

interface ZoneShapeProps {
  zone: Zone;
  isSelected: boolean;
  occupantCount: number;
  onZoneEnter: (zone: Zone) => void;
  onSelect: (zoneId: string) => void;
  onHoverStart: (zoneId: string, pageX: number, pageY: number) => void;
  onHoverMove: (pageX: number, pageY: number) => void;
  onHoverEnd: () => void;
}

const ZoneShape = memo(function ZoneShape({
  zone,
  isSelected,
  occupantCount,
  onZoneEnter,
  onSelect,
  onHoverStart,
  onHoverMove,
  onHoverEnd,
}: ZoneShapeProps) {
  const [hovered, setHovered] = useState(false);
  const accent = ZONE_ACCENT_COLORS[zone.type] ?? '#6366F1';

  const getPagePos = (e: Konva.KonvaEventObject<MouseEvent>) => ({
    px: e.evt.clientX,
    py: e.evt.clientY,
  });

  return (
    <Group
      x={zone.x}
      y={zone.y}
      onMouseEnter={(e) => {
        setHovered(true);
        const { px, py } = getPagePos(e);
        onHoverStart(zone.id, px, py);
      }}
      onMouseMove={(e) => {
        const { px, py } = getPagePos(e);
        onHoverMove(px, py);
      }}
      onMouseLeave={() => {
        setHovered(false);
        onHoverEnd();
      }}
      onClick={() => onSelect(zone.id)}
      onDblClick={() => onZoneEnter(zone)}
    >
      {/* Main background with gradient */}
      <Rect
        width={zone.width}
        height={zone.height}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: zone.height }}
        fillLinearGradientColorStops={[
          0, hexToRgba(accent, 0.18),
          1, hexToRgba(accent, 0.06),
        ]}
        stroke={isSelected ? accent : hovered ? hexToRgba(accent, 0.6) : hexToRgba(accent, 0.3)}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={12}
        shadowColor={accent}
        shadowBlur={hovered || isSelected ? 18 : 0}
        shadowOpacity={0.4}
        shadowEnabled={hovered || isSelected}
      />
      {/* Top accent border */}
      <Rect
        x={12}
        y={0}
        width={zone.width - 24}
        height={3}
        fill={accent}
        cornerRadius={2}
        listening={false}
      />
      {/* Zone icon */}
      <Text
        text={ZONE_ICONS[zone.type] ?? ''}
        y={12}
        width={zone.width}
        align="center"
        fontSize={20}
        listening={false}
      />
      {/* Zone name — Syne bold */}
      <Text
        text={zone.name}
        y={40}
        width={zone.width}
        align="center"
        fontSize={13}
        fontFamily="'Syne', sans-serif"
        fontStyle="bold"
        fill="#F1F5F9"
        listening={false}
      />
      {/* Capacity pill */}
      {zone.max_capacity != null && (
        <Group x={zone.width / 2 - 24} y={zone.height - 26}>
          <Rect
            width={48}
            height={18}
            fill={hexToRgba(accent, 0.2)}
            stroke={hexToRgba(accent, 0.5)}
            strokeWidth={1}
            cornerRadius={9}
          />
          <Text
            text={`${occupantCount}/${zone.max_capacity}`}
            width={48}
            height={18}
            align="center"
            verticalAlign="middle"
            fontSize={10}
            fill={accent}
            fontFamily="'DM Sans', sans-serif"
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
});

// ---------------------------------------------------------------------------
// AvatarCircle
// ---------------------------------------------------------------------------

interface AvatarCircleProps {
  position: AvatarPosition;
  profile: Profile | undefined;
  isCurrent: boolean;
  isSpeaking: boolean;
  onDragEnd: (x: number, y: number) => void;
  onClick?: () => void;
}

const AvatarCircle = memo(function AvatarCircle({
  position,
  profile,
  isCurrent,
  isSpeaking,
  onDragEnd,
  onClick,
}: AvatarCircleProps) {
  const groupRef = useRef<Konva.Group>(null);
  const pulseRef = useRef<Konva.Circle>(null);
  const moveTweenRef = useRef<Konva.Tween | null>(null);
  const pulseTweenRef = useRef<Konva.Tween | null>(null);
  // Track previous position so we don't tween on first mount.
  const prevPosRef = useRef<{ x: number; y: number } | null>(null);

  const avatarColor = hashColor(position.user_id);
  const initials = profile ? getInitials(profile.display_name) : '?';
  const ringColor = statusColor(profile?.teams_status ?? null);

  // Position interpolation tween for remote users.
  useEffect(() => {
    const node = groupRef.current;
    if (!node || isCurrent) {
      // For current user, keep node in sync via draggable; just update ref.
      prevPosRef.current = { x: position.x, y: position.y };
      return;
    }

    const prev = prevPosRef.current;
    prevPosRef.current = { x: position.x, y: position.y };

    if (!prev) {
      // First mount: jump directly.
      node.x(position.x);
      node.y(position.y);
      return;
    }

    if (prev.x === position.x && prev.y === position.y) return;

    moveTweenRef.current?.destroy();
    moveTweenRef.current = new Konva.Tween({
      node,
      x: position.x,
      y: position.y,
      duration: 0.2,
      easing: Konva.Easings.EaseInOut,
    });
    moveTweenRef.current.play();
  }, [position.x, position.y, isCurrent]);

  // Cleanup move tween on unmount.
  useEffect(() => {
    return () => {
      moveTweenRef.current?.destroy();
    };
  }, []);

  // Speaking pulse animation.
  useEffect(() => {
    const pulse = pulseRef.current;
    if (!pulse) return;

    if (!isSpeaking) {
      pulseTweenRef.current?.destroy();
      pulse.radius(22);
      pulse.opacity(0);
      return;
    }

    let active = true;

    const tick = () => {
      if (!active || !pulse) return;
      pulse.radius(22);
      pulse.opacity(0.6);
      pulseTweenRef.current?.destroy();
      pulseTweenRef.current = new Konva.Tween({
        node: pulse,
        radius: 30,
        opacity: 0,
        duration: 0.9,
        easing: Konva.Easings.EaseOut,
        onFinish: tick,
      });
      pulseTweenRef.current.play();
    };

    tick();

    return () => {
      active = false;
      pulseTweenRef.current?.destroy();
    };
  }, [isSpeaking]);

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      onDragEnd(e.target.x(), e.target.y());
    },
    [onDragEnd]
  );

  return (
    <Group
      ref={groupRef}
      x={position.x}
      y={position.y}
      draggable={isCurrent}
      onDragEnd={isCurrent ? handleDragEnd : undefined}
      onClick={!isCurrent ? onClick : undefined}
      onMouseEnter={!isCurrent && onClick ? (e) => { e.target.getStage()!.container().style.cursor = 'pointer'; } : undefined}
      onMouseLeave={!isCurrent && onClick ? (e) => { e.target.getStage()!.container().style.cursor = 'default'; } : undefined}
    >
      {/* Speaking pulse ring (animated) */}
      <Circle
        ref={pulseRef}
        radius={22}
        fill="transparent"
        stroke="#22D3EE"
        strokeWidth={2.5}
        opacity={0}
        listening={false}
      />
      {/* Status ring */}
      <Circle
        radius={22}
        fill="transparent"
        stroke={ringColor}
        strokeWidth={2}
        listening={false}
      />
      {/* Avatar body */}
      <Circle radius={20} fill={avatarColor} />
      {/* Initials */}
      <Text
        text={initials}
        fontSize={11}
        fontFamily="Inter, sans-serif"
        fill="#FFFFFF"
        fontStyle="bold"
        width={40}
        height={40}
        offsetX={20}
        offsetY={20}
        align="center"
        verticalAlign="middle"
        listening={false}
      />
      {/* Current-user cyan dot indicator */}
      {isCurrent && (
        <Circle
          x={14}
          y={-14}
          radius={5}
          fill="#22D3EE"
          stroke="#0A0A0F"
          strokeWidth={1.5}
          listening={false}
        />
      )}
    </Group>
  );
});

// ---------------------------------------------------------------------------
// ZoneTooltip — rendered in DOM, outside the Stage
// ---------------------------------------------------------------------------

interface ZoneTooltipProps {
  tooltip: TooltipState;
  zones: Zone[];
  profiles: Map<string, Profile>;
  positions: Map<string, AvatarPosition>;
}

function ZoneTooltip({ tooltip, zones, profiles, positions }: ZoneTooltipProps) {
  if (!tooltip.visible) return null;

  const zone = zones.find((z) => z.id === tooltip.zoneId);
  if (!zone) return null;

  const occupants = Array.from(positions.values()).filter(
    (p) => p.zone_id === zone.id && p.is_online
  );

  return (
    <div
      className="pointer-events-none fixed z-50 max-w-[200px] rounded-lg border border-[#1E1E2E] bg-[#13131A] px-3 py-2 text-left shadow-xl"
      style={{ left: tooltip.pageX + 14, top: tooltip.pageY + 14 }}
    >
      <p className="mb-1 text-xs font-semibold text-slate-200">
        {ZONE_ICONS[zone.type]} {zone.name}
      </p>
      {occupants.length === 0 ? (
        <p className="text-xs text-slate-500">Personne ici</p>
      ) : (
        <ul className="space-y-0.5">
          {occupants.map((p) => {
            const prof = profiles.get(p.user_id);
            return (
              <li
                key={p.user_id}
                className="flex items-center gap-1.5 text-xs text-slate-300"
              >
                <span
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    background: statusColor(prof?.teams_status ?? null),
                  }}
                />
                {prof?.display_name ?? p.user_id}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OfficeCanvas — main export
// ---------------------------------------------------------------------------

export default function OfficeCanvas({
  officeMapId: _officeMapId,
  currentUserId,
  currentUserProfile: _currentUserProfile,
  onZoneEnter,
  onAvatarMove,
  onAvatarClick,
  speakingUserIds,
}: OfficeCanvasProps) {
  const store = useOfficeStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    pageX: 0,
    pageY: 0,
    zoneId: '',
  });

  // ResizeObserver — keeps Stage filling the container.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) {
        setDimensions({
          width: e.contentRect.width,
          height: e.contentRect.height,
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Debounced callback so we don't spam Supabase Realtime on every drag pixel.
  const debouncedMove = useMemo(
    () => debounce((x: number, y: number) => onAvatarMove(x, y), 100),
    [onAvatarMove]
  );

  const handleAvatarDrop = useCallback(
    (x: number, y: number) => debouncedMove(x, y),
    [debouncedMove]
  );

  // Tooltip callbacks
  const handleHoverStart = useCallback(
    (zoneId: string, pageX: number, pageY: number) => {
      setTooltip({ visible: true, pageX, pageY, zoneId });
    },
    []
  );

  const handleHoverMove = useCallback((pageX: number, pageY: number) => {
    setTooltip((t) => ({ ...t, pageX, pageY }));
  }, []);

  const handleHoverEnd = useCallback(() => {
    setTooltip((t) => ({ ...t, visible: false }));
  }, []);

  const positionsList = useMemo(
    () => Array.from(store.positions.values()),
    [store.positions]
  );

  const occupantCounts = useMemo(() => {
    const counts = new Map<string, number>();
    store.positions.forEach((pos) => {
      if (pos.is_online && pos.zone_id) {
        counts.set(pos.zone_id, (counts.get(pos.zone_id) ?? 0) + 1);
      }
    });
    return counts;
  }, [store.positions]);

  return (
    <div
      ref={containerRef}
      className={cn('canvas-floor relative h-full w-full overflow-hidden')}
    >
      <Stage width={dimensions.width} height={dimensions.height}>
        {/* Layer 1 — Zones (static geometry, memoized) */}
        <Layer listening={true}>
          {store.zones.map((zone) => (
            <ZoneShape
              key={zone.id}
              zone={zone}
              isSelected={store.selectedZoneId === zone.id}
              occupantCount={occupantCounts.get(zone.id) ?? 0}
              onZoneEnter={onZoneEnter}
              onSelect={(id) => store.setSelectedZone(id)}
              onHoverStart={handleHoverStart}
              onHoverMove={handleHoverMove}
              onHoverEnd={handleHoverEnd}
            />
          ))}
        </Layer>

        {/* Layer 2 — Avatars (dynamic, real-time positions) */}
        <Layer>
          {positionsList.map((pos) => (
            <AvatarCircle
              key={pos.user_id}
              position={pos}
              profile={store.profiles.get(pos.user_id)}
              isCurrent={pos.user_id === currentUserId}
              isSpeaking={speakingUserIds.has(pos.user_id)}
              onDragEnd={
                pos.user_id === currentUserId
                  ? handleAvatarDrop
                  : () => undefined
              }
              onClick={
                pos.user_id !== currentUserId && onAvatarClick
                  ? () => onAvatarClick(pos.user_id)
                  : undefined
              }
            />
          ))}
        </Layer>
      </Stage>

      {/* Vignette overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* DOM-layer tooltip — rendered outside the Stage so it's above everything */}
      <ZoneTooltip
        tooltip={tooltip}
        zones={store.zones}
        profiles={store.profiles}
        positions={store.positions}
      />
    </div>
  );
}
