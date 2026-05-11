'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, WorkSchedule, WorkScheduleStatus } from '@/lib/types/database'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  WorkScheduleStatus,
  { label: string; emoji: string; bg: string; text: string; border: string }
> = {
  office:   { label: 'Bureau',    emoji: '🏢', bg: 'rgba(34,197,94,0.15)',  text: '#4ADE80', border: 'rgba(34,197,94,0.3)' },
  remote:   { label: 'Télétravail', emoji: '🏠', bg: 'rgba(99,102,241,0.15)', text: '#818CF8', border: 'rgba(99,102,241,0.3)' },
  vacation: { label: 'Congés',    emoji: '🌴', bg: 'rgba(245,158,11,0.15)', text: '#FCD34D', border: 'rgba(245,158,11,0.3)' },
  sick:     { label: 'Maladie',   emoji: '🤒', bg: 'rgba(239,68,68,0.15)',  text: '#F87171', border: 'rgba(239,68,68,0.3)' },
  absent:   { label: 'Absent',    emoji: '❌', bg: 'rgba(100,116,139,0.1)', text: '#64748B', border: 'rgba(100,116,139,0.2)' },
  rtt:      { label: 'RTT',       emoji: '🛌', bg: 'rgba(139,92,246,0.15)', text: '#C4B5FD', border: 'rgba(139,92,246,0.3)' },
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(d.getDate() + n)
  return result
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0] ?? '').join('').toUpperCase().slice(0, 2)
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WorkScheduleStatus | null }) {
  if (!status) {
    return (
      <span
        className="inline-flex items-center justify-center h-7 rounded-md text-xs font-medium px-2 select-none"
        style={{ background: 'rgba(255,255,255,0.03)', color: '#334155', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        —
      </span>
    )
  }
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className="inline-flex items-center gap-1 h-7 rounded-md text-xs font-medium px-2 select-none whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
    >
      <span>{cfg.emoji}</span>
      <span className="hidden sm:inline">{cfg.label}</span>
    </span>
  )
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  date: Date
  current: WorkScheduleStatus | null
  note: string | null
  onSave: (status: WorkScheduleStatus, note: string) => Promise<void>
  onClose: () => void
}

function EditModal({ date, current, note: initialNote, onSave, onClose }: EditModalProps) {
  const [status, setStatus] = useState<WorkScheduleStatus>(current ?? 'office')
  const [note, setNote] = useState(initialNote ?? '')
  const [saving, setSaving] = useState(false)

  const label = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  async function handleSave() {
    setSaving(true)
    await onSave(status, note)
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
        style={{
          background: '#13131A',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        <div>
          <h3 className="font-bold text-base capitalize" style={{ color: '#F1F5F9', fontFamily: "'Syne', sans-serif" }}>
            {label}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Modifier le statut de présence</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(STATUS_CONFIG) as [WorkScheduleStatus, typeof STATUS_CONFIG[WorkScheduleStatus]][]).map(
            ([key, cfg]) => (
              <button
                key={key}
                onClick={() => setStatus(key)}
                className="flex items-center gap-2 h-10 rounded-xl px-3 text-sm font-medium transition-all duration-150"
                style={{
                  background: status === key ? cfg.bg : 'rgba(255,255,255,0.03)',
                  color: status === key ? cfg.text : '#64748B',
                  border: `1px solid ${status === key ? cfg.border : 'rgba(255,255,255,0.06)'}`,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <span>{cfg.emoji}</span>
                <span>{cfg.label}</span>
              </button>
            )
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: '#64748B' }}>
            Note (optionnel)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: demi-journée, réunion externe…"
            className="w-full h-10 rounded-xl px-3 text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#F1F5F9',
              fontFamily: "'DM Sans', sans-serif",
            }}
            onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(99,102,241,0.5)' }}
            onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: '#64748B',
              border: '1px solid rgba(255,255,255,0.06)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-10 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #818CF8)',
              color: '#fff',
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: '0 0 20px rgba(99,102,241,0.3)',
            }}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface EditTarget {
  userId: string
  date: Date
  current: WorkScheduleStatus | null
  note: string | null
}

export default function SchedulePage() {
  const supabase = useMemo(() => createClient(), [])

  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [members, setMembers] = useState<Profile[]>([])
  const [schedules, setSchedules] = useState<WorkSchedule[]>([])
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [loading, setLoading] = useState(true)

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const weekDateStrings = useMemo(() => weekDays.map(toISO), [weekDays])

  // Bootstrap: fetch current user + members
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) return

      setCurrentUser({ id: user.id, role: profile.role })
      setOrgId(profile.organization_id)

      const { data: membersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('display_name')

      setMembers(membersData ?? [])
    }

    void init()
  }, [supabase])

  // Fetch schedules for current week whenever week or org changes
  const fetchSchedules = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    const { data } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('organization_id', orgId)
      .gte('date', weekDateStrings[0])
      .lte('date', weekDateStrings[6])

    setSchedules(data ?? [])
    setLoading(false)
  }, [orgId, supabase, weekDateStrings])

  useEffect(() => {
    void fetchSchedules()
  }, [fetchSchedules])

  // Build lookup: scheduleMap[userId][dateStr] = WorkSchedule
  const scheduleMap = useMemo(() => {
    const m = new Map<string, Map<string, WorkSchedule>>()
    for (const s of schedules) {
      if (!m.has(s.user_id)) m.set(s.user_id, new Map())
      m.get(s.user_id)!.set(s.date, s)
    }
    return m
  }, [schedules])

  function canEdit(userId: string): boolean {
    if (!currentUser) return false
    return currentUser.id === userId || currentUser.role === 'admin'
  }

  function openEdit(userId: string, date: Date) {
    if (!canEdit(userId)) return
    const existing = scheduleMap.get(userId)?.get(toISO(date))
    setEditTarget({
      userId,
      date,
      current: existing?.status ?? null,
      note: existing?.note ?? null,
    })
  }

  async function handleSave(status: WorkScheduleStatus, note: string) {
    if (!editTarget || !orgId) return

    await supabase.from('work_schedules').upsert({
      user_id: editTarget.userId,
      organization_id: orgId,
      date: toISO(editTarget.date),
      status,
      note: note.trim() || null,
    }, { onConflict: 'user_id,date' })

    setEditTarget(null)
    await fetchSchedules()
  }

  function exportCSV() {
    const header = ['Membre', ...weekDays.map((d) => d.toLocaleDateString('fr-FR'))]
    const rows = members.map((m) => {
      const cols = weekDays.map((d) => {
        const s = scheduleMap.get(m.id)?.get(toISO(d))
        return s ? STATUS_CONFIG[s.status].label : ''
      })
      return [m.display_name, ...cols]
    })

    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `planning_${toISO(weekStart)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0A0A0F' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div>
          <h1 className="font-bold text-xl" style={{ color: '#F1F5F9', fontFamily: "'Syne', sans-serif" }}>
            Planning équipe
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748B', fontFamily: "'DM Sans', sans-serif" }}>
            {formatWeekRange(weekStart)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Week navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#64748B', border: '1px solid rgba(255,255,255,0.06)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#F1F5F9' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B' }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setWeekStart(getMonday(new Date()))}
              className="flex items-center justify-center h-8 px-3 rounded-lg text-xs font-medium transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#64748B', border: '1px solid rgba(255,255,255,0.06)', fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#F1F5F9' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B' }}
            >
              Aujourd&apos;hui
            </button>
            <button
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#64748B', border: '1px solid rgba(255,255,255,0.06)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#F1F5F9' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Export */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: 'rgba(99,102,241,0.15)',
              color: '#818CF8',
              border: '1px solid rgba(99,102,241,0.3)',
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.25)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)' }}
          >
            <Download size={14} />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading && members.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
          </div>
        ) : (
          <table className="w-full border-collapse" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                {/* Member column header */}
                <th
                  className="text-left pb-3 pr-4 text-xs font-semibold w-44 sticky left-0"
                  style={{ color: '#475569', fontFamily: "'DM Sans', sans-serif", background: '#0A0A0F' }}
                >
                  Membre
                </th>
                {weekDays.map((day, i) => {
                  const isToday = toISO(day) === toISO(new Date())
                  return (
                    <th
                      key={i}
                      className="text-center pb-3 text-xs font-semibold"
                      style={{ color: isToday ? '#818CF8' : '#475569', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <div>{DAY_LABELS[i]}</div>
                      <div
                        className="mt-0.5 mx-auto flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                        style={{
                          background: isToday ? 'rgba(99,102,241,0.2)' : 'transparent',
                          color: isToday ? '#818CF8' : '#64748B',
                        }}
                      >
                        {day.getDate()}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {members.map((member, mIdx) => (
                <tr
                  key={member.id}
                  style={{
                    borderTop: mIdx === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {/* Member info */}
                  <td className="py-2.5 pr-4 sticky left-0" style={{ background: '#0A0A0F' }}>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background: `hsl(${member.id.charCodeAt(0) * 7 % 360}, 50%, 35%)`,
                          color: '#F1F5F9',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {getInitials(member.display_name)}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: '#F1F5F9', fontFamily: "'DM Sans', sans-serif", maxWidth: 100 }}
                        >
                          {member.display_name}
                        </p>
                        {member.role === 'admin' && (
                          <p className="text-[10px]" style={{ color: '#6366F1', fontFamily: "'DM Sans', sans-serif" }}>Admin</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Day cells */}
                  {weekDays.map((day, dIdx) => {
                    const dateStr = toISO(day)
                    const schedule = scheduleMap.get(member.id)?.get(dateStr)
                    const editable = canEdit(member.id)
                    const isWeekend = dIdx >= 5

                    return (
                      <td key={dIdx} className="py-2.5 px-1 text-center">
                        {isWeekend ? (
                          <span className="inline-block w-full h-7" style={{ opacity: 0.2 }}>
                            <StatusBadge status={schedule?.status ?? null} />
                          </span>
                        ) : (
                          <button
                            onClick={() => openEdit(member.id, day)}
                            disabled={!editable}
                            className="w-full flex justify-center transition-transform duration-100 disabled:cursor-default"
                            style={{ background: 'none', border: 'none', padding: 0 }}
                            onMouseEnter={(e) => { if (editable) e.currentTarget.style.transform = 'scale(1.04)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                          >
                            <StatusBadge status={schedule?.status ?? null} />
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div
        className="shrink-0 px-6 py-3 flex items-center gap-4 flex-wrap"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-xs" style={{ color: '#334155', fontFamily: "'DM Sans', sans-serif" }}>Légende :</span>
        {(Object.entries(STATUS_CONFIG) as [WorkScheduleStatus, typeof STATUS_CONFIG[WorkScheduleStatus]][]).map(
          ([key, cfg]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: cfg.text, fontFamily: "'DM Sans', sans-serif" }}
            >
              {cfg.emoji} {cfg.label}
            </span>
          )
        )}
      </div>

      {/* Edit modal */}
      {editTarget && (
        <EditModal
          date={editTarget.date}
          current={editTarget.current}
          note={editTarget.note}
          onSave={handleSave}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}
