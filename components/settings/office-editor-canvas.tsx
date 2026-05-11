'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Stage, Layer, Rect, Text, Transformer } from 'react-konva'
import Konva from 'konva'
import { ZONE_ACCENT_COLORS, ZONE_ICONS, ZONE_COLORS } from '@/lib/canvas/layouts'
import { createClient } from '@/lib/supabase/client'
import type { Zone, OfficeMap, Decoration, ZoneType } from '@/lib/types/database'
import { Save, Trash2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types & constants ────────────────────────────────────────────────────────

type EditableZone = Zone & { _isNew?: boolean }

type AddMode =
  | { kind: 'zone'; zoneType: ZoneType }
  | { kind: 'decoration'; emoji: string }
  | null

const GRID = 10
const MIN_W = 80
const MIN_H = 60
const DEFAULT_ZONE_W = 200
const DEFAULT_ZONE_H = 150
const DEFAULT_DECO_SIZE = 28

const ZONE_TYPES: { type: ZoneType; label: string }[] = [
  { type: 'open_space',   label: 'Open Space' },
  { type: 'meeting_room', label: 'Meeting Room' },
  { type: 'focus',        label: 'Focus Zone' },
  { type: 'break',        label: 'Café' },
  { type: 'social',       label: 'Social' },
  { type: 'custom',       label: 'Custom' },
]

const DECORATION_ITEMS = [
  { emoji: '🪴', label: 'Plante' },
  { emoji: '🖥️', label: 'Écran' },
  { emoji: '📋', label: 'Tableau' },
  { emoji: '☕', label: 'Café' },
  { emoji: '🚪', label: 'Porte' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function snap(v: number): number {
  return Math.round(v / GRID) * GRID
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── Zone properties panel ────────────────────────────────────────────────────

function ZonePanel({
  zone,
  onChange,
  onDelete,
}: {
  zone: EditableZone
  onChange: (c: Partial<EditableZone>) => void
  onDelete: () => void
}) {
  return (
    <div className="p-4 flex flex-col gap-4 h-full overflow-y-auto">
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#334155' }}>
        Zone sélectionnée
      </p>

      {/* Name */}
      <div className="space-y-1">
        <label className="text-[10px] text-[#475569]">Nom</label>
        <input
          type="text"
          value={zone.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full h-8 rounded-lg px-2.5 text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#F1F5F9', fontFamily: "'DM Sans', sans-serif" }}
          onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(99,102,241,0.5)' }}
          onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-[#475569]">Type</label>
        <div className="flex flex-col gap-1">
          {ZONE_TYPES.map(({ type, label }) => {
            const accent = ZONE_ACCENT_COLORS[type] ?? '#6366F1'
            const active = zone.type === type
            return (
              <button
                key={type}
                onClick={() => onChange({ type, color: ZONE_COLORS[type] ?? accent })}
                className="flex items-center gap-2 h-7 px-2 rounded text-[10px] font-medium text-left transition-all"
                style={{
                  background: active ? hexToRgba(accent, 0.2) : 'rgba(255,255,255,0.02)',
                  color: active ? accent : '#475569',
                  border: `1px solid ${active ? hexToRgba(accent, 0.4) : 'rgba(255,255,255,0.04)'}`,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {ZONE_ICONS[type]} {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Capacity */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-[#475569]">Capacité max</label>
          <button
            onClick={() => onChange({ max_capacity: zone.max_capacity === null ? 10 : null })}
            className="text-[10px] transition-colors"
            style={{ color: zone.max_capacity === null ? '#4ADE80' : '#64748B', fontFamily: "'DM Sans', sans-serif" }}
          >
            {zone.max_capacity === null ? '∞ illimitée' : 'limiter'}
          </button>
        </div>
        {zone.max_capacity !== null && (
          <input
            type="number"
            min={1}
            value={zone.max_capacity}
            onChange={(e) => onChange({ max_capacity: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-full h-8 rounded-lg px-2.5 text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#F1F5F9', fontFamily: "'DM Sans', sans-serif" }}
            onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(99,102,241,0.5)' }}
            onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)' }}
          />
        )}
      </div>

      {/* Auto-mute */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#475569]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Sourdine auto</span>
        <button
          onClick={() => onChange({ auto_mute: !zone.auto_mute })}
          className={cn('relative w-8 h-4 rounded-full transition-colors duration-200', zone.auto_mute ? 'bg-[#6366F1]' : 'bg-[#1E1E2E]')}
        >
          <span className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200', zone.auto_mute ? 'translate-x-4' : 'translate-x-0.5')} />
        </button>
      </div>

      {/* Dimensions (read-only) */}
      <div className="space-y-1">
        <p className="text-[10px] text-[#334155]">Position & taille</p>
        <div className="grid grid-cols-2 gap-1">
          {[['X', zone.x], ['Y', zone.y], ['L', zone.width], ['H', zone.height]].map(([lbl, val]) => (
            <div key={lbl} className="flex items-center gap-1.5 px-2 h-6 rounded"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-[9px] text-[#334155]">{lbl}</span>
              <span className="text-[10px] text-[#64748B] font-mono">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="flex items-center justify-center gap-1.5 w-full h-8 rounded-lg text-xs font-medium mt-auto transition-all"
        style={{ background: 'rgba(239,68,68,0.08)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)', fontFamily: "'DM Sans', sans-serif" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
      >
        <Trash2 size={12} />
        Supprimer
      </button>
    </div>
  )
}

// ─── Decoration properties panel ──────────────────────────────────────────────

function DecoPanel({
  deco,
  onChange,
  onDelete,
}: {
  deco: Decoration
  onChange: (c: Partial<Decoration>) => void
  onDelete: () => void
}) {
  return (
    <div className="p-4 flex flex-col gap-4 h-full overflow-y-auto">
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#334155' }}>
        Décoration
      </p>

      {/* Preview */}
      <div className="flex items-center justify-center h-14 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', fontSize: deco.size }}>
        {deco.emoji}
      </div>

      {/* Emoji picker */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-[#475569]">Emoji</label>
        <div className="flex flex-wrap gap-1.5">
          {DECORATION_ITEMS.map(({ emoji }) => (
            <button
              key={emoji}
              onClick={() => onChange({ emoji })}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
              style={{
                background: deco.emoji === emoji ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${deco.emoji === emoji ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                fontSize: 18,
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Size slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-[#475569]">Taille</label>
          <span className="text-[10px] font-mono text-[#64748B]">{deco.size}px</span>
        </div>
        <input
          type="range" min={16} max={64} step={4} value={deco.size}
          onChange={(e) => onChange({ size: parseInt(e.target.value) })}
          className="w-full accent-[#6366F1]"
        />
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="flex items-center justify-center gap-1.5 w-full h-8 rounded-lg text-xs font-medium mt-auto transition-all"
        style={{ background: 'rgba(239,68,68,0.08)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)', fontFamily: "'DM Sans', sans-serif" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
      >
        <Trash2 size={12} />
        Supprimer
      </button>
    </div>
  )
}

// ─── Double-click edit modal ──────────────────────────────────────────────────

function EditZoneModal({
  zone,
  onSave,
  onClose,
}: {
  zone: EditableZone
  onSave: (changes: Partial<EditableZone>) => void
  onClose: () => void
}) {
  const [name, setName] = useState(zone.name)
  const [type, setType] = useState<ZoneType>(zone.type)
  const [capacity, setCapacity] = useState<number | null>(zone.max_capacity)

  function handleSave() {
    onSave({
      name: name.trim() || zone.name,
      type,
      color: ZONE_COLORS[type] ?? ZONE_COLORS.custom,
      max_capacity: capacity,
    })
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#F1F5F9',
    fontFamily: "'DM Sans', sans-serif",
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
        style={{
          background: '#13131A',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }}
      >
        <div>
          <h3 className="font-bold text-base" style={{ color: '#F1F5F9', fontFamily: "'Syne', sans-serif" }}>
            Modifier la zone
          </h3>
          <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Nom, type et capacité</p>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: '#64748B', fontFamily: "'DM Sans', sans-serif" }}>Nom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="h-10 rounded-xl px-3 text-sm outline-none"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(99,102,241,0.5)' }}
            onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)' }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          />
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: '#64748B', fontFamily: "'DM Sans', sans-serif" }}>Type</label>
          <div className="grid grid-cols-2 gap-1.5">
            {ZONE_TYPES.map(({ type: t, label }) => {
              const accent = ZONE_ACCENT_COLORS[t] ?? '#64748B'
              const active = type === t
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="flex items-center gap-2 h-9 px-3 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: active ? hexToRgba(accent, 0.2) : 'rgba(255,255,255,0.03)',
                    color: active ? accent : '#64748B',
                    border: `1px solid ${active ? hexToRgba(accent, 0.4) : 'rgba(255,255,255,0.06)'}`,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <span>{ZONE_ICONS[t]}</span>
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Capacity */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium" style={{ color: '#64748B', fontFamily: "'DM Sans', sans-serif" }}>Capacité max</label>
            <button
              onClick={() => setCapacity(capacity === null ? 10 : null)}
              className="text-xs transition-colors"
              style={{ color: capacity === null ? '#4ADE80' : '#64748B', fontFamily: "'DM Sans', sans-serif" }}
            >
              {capacity === null ? '∞ illimitée' : 'limiter'}
            </button>
          </div>
          {capacity !== null && (
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-10 rounded-xl px-3 text-sm outline-none"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(99,102,241,0.5)' }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)' }}
            />
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#64748B', border: '1px solid rgba(255,255,255,0.06)', fontFamily: "'DM Sans', sans-serif" }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="flex-1 h-10 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)', color: '#fff', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Confirm reset dialog ─────────────────────────────────────────────────────

function ConfirmResetDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="w-full max-w-xs rounded-2xl p-6 flex flex-col gap-5"
        style={{
          background: '#13131A',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }}
      >
        <div className="flex flex-col gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(239,68,68,0.12)' }}>
            ↩️
          </div>
          <h3 className="font-bold text-base" style={{ color: '#F1F5F9', fontFamily: "'Syne', sans-serif" }}>
            Réinitialiser le plan ?
          </h3>
          <p className="text-sm" style={{ color: '#64748B', fontFamily: "'DM Sans', sans-serif" }}>
            Toutes les modifications non sauvegardées seront perdues.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#64748B', border: '1px solid rgba(255,255,255,0.06)', fontFamily: "'DM Sans', sans-serif" }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-10 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)', fontFamily: "'DM Sans', sans-serif" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)' }}
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main editor component ────────────────────────────────────────────────────

interface Props {
  officeMap: OfficeMap
  initialZones: Zone[]
}

export default function OfficeEditorCanvas({ officeMap, initialZones }: Props) {
  const stageRef     = useRef<Konva.Stage>(null)
  const trRef        = useRef<Konva.Transformer>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [dims, setDims]             = useState({ width: 800, height: 600 })
  const [zones, setZones]           = useState<EditableZone[]>(() => initialZones.map((z) => ({ ...z })))
  const [decorations, setDecorations] = useState<Decoration[]>(() => {
    const raw = officeMap.layout_json?.decorations
    return Array.isArray(raw) ? (raw as Decoration[]) : []
  })
  const [selectedId, setSelectedId]       = useState<string | null>(null)
  const [addMode, setAddMode]             = useState<AddMode>(null)
  const [saveStatus, setSaveStatus]       = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [editModalZone, setEditModalZone] = useState<EditableZone | null>(null)
  const [showConfirmReset, setShowConfirmReset] = useState(false)

  // Track original IDs so we can DELETE removed zones on save
  const originalIds = useRef<Set<string>>(new Set(initialZones.map((z) => z.id)))

  // ── resize observer ────────────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const e = entries[0]
      if (e) setDims({ width: e.contentRect.width, height: e.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── attach Transformer to selected zone Rect ───────────────────────────────

  useEffect(() => {
    const tr = trRef.current
    if (!tr) return
    if (selectedId && !selectedId.startsWith('dec_')) {
      const node = stageRef.current?.findOne('#' + selectedId)
      if (node) {
        tr.nodes([node])
        tr.getLayer()?.batchDraw()
        return
      }
    }
    tr.nodes([])
    tr.getLayer()?.batchDraw()
  }, [selectedId])

  // ── keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) handleDelete(selectedId)
      }
      if (e.key === 'Escape') setAddMode(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── event handlers ─────────────────────────────────────────────────────────

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (addMode) {
      const pos = stageRef.current?.getPointerPosition()
      if (!pos) return

      if (addMode.kind === 'zone') {
        const zoneType = addMode.zoneType
        const accent = ZONE_ACCENT_COLORS[zoneType] ?? '#6366F1'
        const newZone: EditableZone = {
          id: crypto.randomUUID(),
          office_map_id: officeMap.id,
          name: ZONE_TYPES.find((z) => z.type === zoneType)?.label ?? 'Zone',
          type: zoneType,
          x: snap(pos.x - DEFAULT_ZONE_W / 2),
          y: snap(pos.y - DEFAULT_ZONE_H / 2),
          width: DEFAULT_ZONE_W,
          height: DEFAULT_ZONE_H,
          color: ZONE_COLORS[zoneType] ?? accent,
          max_capacity: null,
          auto_mute: false,
          created_at: new Date().toISOString(),
          _isNew: true,
        }
        setZones((prev) => [...prev, newZone])
        setSelectedId(newZone.id)
      } else {
        const newDeco: Decoration = {
          id: crypto.randomUUID(),
          emoji: addMode.emoji,
          x: snap(pos.x - DEFAULT_DECO_SIZE / 2),
          y: snap(pos.y - DEFAULT_DECO_SIZE / 2),
          size: DEFAULT_DECO_SIZE,
        }
        setDecorations((prev) => [...prev, newDeco])
        setSelectedId(`dec_${newDeco.id}`)
      }
      setAddMode(null)
      return
    }
    if (e.target === e.target.getStage()) {
      setSelectedId(null)
    }
  }

  function handleZoneDragEnd(id: string, e: Konva.KonvaEventObject<MouseEvent>) {
    const node = e.target
    setZones((prev) =>
      prev.map((z) => z.id === id ? { ...z, x: snap(node.x()), y: snap(node.y()) } : z)
    )
  }

  function handleZoneTransformEnd(id: string, e: Konva.KonvaEventObject<Event>) {
    const node = e.target as Konva.Rect
    const newX = snap(node.x())
    const newY = snap(node.y())
    const newW = Math.max(MIN_W, snap(Math.abs(node.width() * node.scaleX())))
    const newH = Math.max(MIN_H, snap(Math.abs(node.height() * node.scaleY())))
    node.scaleX(1)
    node.scaleY(1)
    node.x(newX); node.y(newY)
    node.width(newW); node.height(newH)
    setZones((prev) =>
      prev.map((z) => z.id === id ? { ...z, x: newX, y: newY, width: newW, height: newH } : z)
    )
  }

  function handleZoneDblClick(id: string) {
    if (addMode) return
    const zone = zones.find((z) => z.id === id)
    if (zone) setEditModalZone(zone)
  }

  function handleDecorationDragEnd(id: string, e: Konva.KonvaEventObject<MouseEvent>) {
    const node = e.target
    setDecorations((prev) =>
      prev.map((d) => d.id === id ? { ...d, x: snap(node.x()), y: snap(node.y()) } : d)
    )
  }

  function handleDelete(selId: string) {
    if (selId.startsWith('dec_')) {
      setDecorations((prev) => prev.filter((d) => d.id !== selId.slice(4)))
    } else {
      setZones((prev) => prev.filter((z) => z.id !== selId))
    }
    setSelectedId(null)
  }

  function updateZone(id: string, changes: Partial<EditableZone>) {
    setZones((prev) => prev.map((z) => z.id === id ? { ...z, ...changes } : z))
  }

  function updateDecoration(id: string, changes: Partial<Decoration>) {
    setDecorations((prev) => prev.map((d) => d.id === id ? { ...d, ...changes } : d))
  }

  const handleReset = useCallback(() => {
    setZones(initialZones.map((z) => ({ ...z })))
    const raw = officeMap.layout_json?.decorations
    setDecorations(Array.isArray(raw) ? (raw as Decoration[]) : [])
    setSelectedId(null)
    setAddMode(null)
    setSaveStatus('idle')
    setShowConfirmReset(false)
  }, [initialZones, officeMap.layout_json])

  async function handleSave() {
    setSaveStatus('saving')
    const supabase = createClient()
    try {
      // Delete zones that existed in DB but were removed in the editor
      const currentIds = new Set(zones.map((z) => z.id))
      const toDelete = Array.from(originalIds.current).filter((id) => !currentIds.has(id))
      if (toDelete.length > 0) {
        await supabase.from('zones').delete().in('id', toDelete)
      }

      // Upsert all current zones (handles new + existing)
      if (zones.length > 0) {
        const rows = zones.map(({ _isNew: _n, ...z }) => ({
          id: z.id,
          office_map_id: officeMap.id,
          name: z.name,
          type: z.type,
          x: z.x,
          y: z.y,
          width: z.width,
          height: z.height,
          color: z.color,
          max_capacity: z.max_capacity,
          auto_mute: z.auto_mute,
        }))
        const { error } = await supabase.from('zones').upsert(rows, { onConflict: 'id' })
        if (error) throw error
      }

      // Persist decorations in layout_json
      const { error: mapErr } = await supabase
        .from('office_maps')
        .update({ layout_json: { decorations } })
        .eq('id', officeMap.id)
      if (mapErr) throw mapErr

      // Update original IDs reference
      originalIds.current = new Set(zones.map((z) => z.id))

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 4000)
    }
  }

  // ── derived state ──────────────────────────────────────────────────────────

  const selectedZone  = zones.find((z) => z.id === selectedId)
  const selectedDecoId = selectedId?.startsWith('dec_') ? selectedId.slice(4) : null
  const selectedDeco  = decorations.find((d) => d.id === selectedDecoId)

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0A0A0F' }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0D0D14' }}
      >
        <div>
          <h1 className="font-bold text-base" style={{ color: '#F1F5F9', fontFamily: "'Syne', sans-serif" }}>
            Éditeur de plan
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#475569', fontFamily: "'DM Sans', sans-serif" }}>
            {officeMap.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {addMode && (
            <span
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(99,102,241,0.12)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)', fontFamily: "'DM Sans', sans-serif" }}
            >
              Cliquez sur le plan pour placer — Échap pour annuler
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Erreur lors de l&apos;enregistrement
            </span>
          )}
          <button
            onClick={() => setShowConfirmReset(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#64748B', border: '1px solid rgba(255,255,255,0.06)', fontFamily: "'DM Sans', sans-serif" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F1F5F9' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B' }}
          >
            <RotateCcw size={12} />
            Réinitialiser
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 h-8 px-4 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all"
            style={{
              background: saveStatus === 'saved' ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #6366F1, #818CF8)',
              color: saveStatus === 'saved' ? '#4ADE80' : '#fff',
              border: saveStatus === 'saved' ? '1px solid rgba(34,197,94,0.35)' : 'none',
              boxShadow: saveStatus === 'saved' ? 'none' : '0 0 16px rgba(99,102,241,0.3)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <Save size={12} />
            {saveStatus === 'saving' ? 'Enregistrement…' : saveStatus === 'saved' ? 'Enregistré ✓' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Body: left palette + canvas + right panel */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left palette */}
        <div
          className="w-44 shrink-0 flex flex-col gap-5 p-3 overflow-y-auto"
          style={{ borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0D0D14' }}
        >
          {/* Zone types */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#334155' }}>
              Zones
            </p>
            <div className="flex flex-col gap-1">
              {ZONE_TYPES.map(({ type, label }) => {
                const accent = ZONE_ACCENT_COLORS[type] ?? '#6366F1'
                const active = addMode?.kind === 'zone' && addMode.zoneType === type
                return (
                  <button
                    key={type}
                    onClick={() => setAddMode(active ? null : { kind: 'zone', zoneType: type })}
                    className="flex items-center gap-2 h-8 px-2.5 rounded-lg text-xs font-medium text-left transition-all"
                    style={{
                      background: active ? hexToRgba(accent, 0.2) : 'rgba(255,255,255,0.03)',
                      color: active ? accent : '#64748B',
                      border: `1px solid ${active ? hexToRgba(accent, 0.4) : 'rgba(255,255,255,0.05)'}`,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <span>{ZONE_ICONS[type]}</span>
                    <span className="flex-1">{label}</span>
                    {active && <span className="text-[10px] opacity-70">+</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Decorations */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#334155' }}>
              Décorations
            </p>
            <div className="flex flex-col gap-1">
              {DECORATION_ITEMS.map(({ emoji, label }) => {
                const active = addMode?.kind === 'decoration' && addMode.emoji === emoji
                return (
                  <button
                    key={emoji}
                    onClick={() => setAddMode(active ? null : { kind: 'decoration', emoji })}
                    className="flex items-center gap-2 h-8 px-2.5 rounded-lg text-xs font-medium text-left transition-all"
                    style={{
                      background: active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                      color: active ? '#818CF8' : '#64748B',
                      border: `1px solid ${active ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.05)'}`,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{emoji}</span>
                    <span className="flex-1">{label}</span>
                    {active && <span className="text-[10px] opacity-70">+</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tips */}
          <p
            className="text-[10px] mt-auto leading-relaxed"
            style={{ color: '#1E293B', fontFamily: "'DM Sans', sans-serif" }}
          >
            Cliquer = sélectionner · Glisser = déplacer · Poignées = redimensionner · Suppr = effacer
          </p>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(circle, #1E1E2E 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            cursor: addMode ? 'crosshair' : 'default',
          }}
        >
          <Stage
            ref={stageRef}
            width={dims.width}
            height={dims.height}
            onClick={handleStageClick}
          >
            <Layer>
              {/* Zone Rects */}
              {zones.map((zone) => {
                const accent = ZONE_ACCENT_COLORS[zone.type] ?? '#6366F1'
                const isSel = selectedId === zone.id
                return (
                  <Rect
                    key={zone.id}
                    id={zone.id}
                    x={zone.x}
                    y={zone.y}
                    width={zone.width}
                    height={zone.height}
                    fill={hexToRgba(accent, isSel ? 0.22 : 0.12)}
                    stroke={accent}
                    strokeWidth={isSel ? 2 : 1}
                    cornerRadius={10}
                    draggable
                    dragBoundFunc={(pos) => ({ x: snap(pos.x), y: snap(pos.y) })}
                    onDragEnd={(e) => handleZoneDragEnd(zone.id, e)}
                    onTransformEnd={(e) => handleZoneTransformEnd(zone.id, e)}
                    onClick={(e) => {
                      if (!addMode) {
                        e.cancelBubble = true
                        setSelectedId(zone.id)
                      }
                    }}
                    onDblClick={(e) => {
                      e.cancelBubble = true
                      handleZoneDblClick(zone.id)
                    }}
                  />
                )
              })}

              {/* Zone labels (non-interactive) */}
              {zones.map((zone) => {
                const accent = ZONE_ACCENT_COLORS[zone.type] ?? '#6366F1'
                return (
                  <React.Fragment key={`lbl-${zone.id}`}>
                    <Text
                      x={zone.x}
                      y={zone.y + 14}
                      width={zone.width}
                      text={ZONE_ICONS[zone.type] ?? ''}
                      fontSize={18}
                      align="center"
                      listening={false}
                    />
                    <Text
                      x={zone.x + 4}
                      y={zone.y + 40}
                      width={zone.width - 8}
                      text={zone.name}
                      fontSize={11}
                      fontFamily="'Syne', sans-serif"
                      fontStyle="bold"
                      fill={accent}
                      align="center"
                      listening={false}
                    />
                  </React.Fragment>
                )
              })}

              {/* Decorations */}
              {decorations.map((d) => {
                const decSelId = `dec_${d.id}`
                const isSel = selectedId === decSelId
                return (
                  <React.Fragment key={d.id}>
                    {isSel && (
                      <Rect
                        x={d.x - 4}
                        y={d.y - 4}
                        width={d.size + 8}
                        height={d.size + 8}
                        fill="transparent"
                        stroke="#6366F1"
                        strokeWidth={1.5}
                        dash={[4, 3]}
                        cornerRadius={4}
                        listening={false}
                      />
                    )}
                    <Text
                      id={decSelId}
                      x={d.x}
                      y={d.y}
                      text={d.emoji}
                      fontSize={d.size}
                      draggable
                      dragBoundFunc={(pos) => ({ x: snap(pos.x), y: snap(pos.y) })}
                      onDragEnd={(e) => handleDecorationDragEnd(d.id, e)}
                      onClick={(e) => {
                        if (!addMode) {
                          e.cancelBubble = true
                          setSelectedId(decSelId)
                        }
                      }}
                    />
                  </React.Fragment>
                )
              })}

              {/* Transformer — resize handles for selected zone */}
              <Transformer
                ref={trRef}
                rotateEnabled={false}
                keepRatio={false}
                borderStroke="#6366F1"
                borderStrokeWidth={1.5}
                anchorFill="#fff"
                anchorStroke="#6366F1"
                anchorSize={8}
                anchorCornerRadius={2}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < MIN_W || newBox.height < MIN_H) return oldBox
                  return newBox
                }}
              />
            </Layer>
          </Stage>
        </div>

        {/* Right properties panel */}
        <div
          className="w-52 shrink-0 overflow-y-auto"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', background: '#0D0D14' }}
        >
          {selectedZone ? (
            <ZonePanel
              zone={selectedZone}
              onChange={(c) => updateZone(selectedZone.id, c)}
              onDelete={() => handleDelete(selectedZone.id)}
            />
          ) : selectedDeco ? (
            <DecoPanel
              deco={selectedDeco}
              onChange={(c) => updateDecoration(selectedDeco.id, c)}
              onDelete={() => handleDelete(`dec_${selectedDeco.id}`)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-5 gap-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#1E1E2E] flex items-center justify-center text-lg">
                🗺️
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: '#334155', fontFamily: "'DM Sans', sans-serif" }}>
                Cliquez pour sélectionner, double-cliquez pour éditer.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Double-click edit modal */}
      {editModalZone && (
        <EditZoneModal
          zone={editModalZone}
          onSave={(changes) => {
            updateZone(editModalZone.id, changes)
            setEditModalZone(null)
          }}
          onClose={() => setEditModalZone(null)}
        />
      )}

      {/* Reset confirmation dialog */}
      {showConfirmReset && (
        <ConfirmResetDialog
          onConfirm={handleReset}
          onCancel={() => setShowConfirmReset(false)}
        />
      )}
    </div>
  )
}
