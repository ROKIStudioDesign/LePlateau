"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BookableRoom, RoomBooking, Profile } from "@/lib/types/database";
import { ChevronLeft, ChevronRight, X, Clock, Users, Plus, DoorOpen } from "lucide-react";

// ─── Timeline constants ───────────────────────────────────────────────────────

const HOUR_START  = 8;   // 08:00
const HOUR_END    = 20;  // 20:00
const SLOT_MIN    = 30;  // 30-min slots
const SLOT_W      = 64;  // px per 30-min slot
const LABEL_W     = 160; // px for the room-name column

const TOTAL_SLOTS  = ((HOUR_END - HOUR_START) * 60) / SLOT_MIN; // 24
const TIMELINE_W   = TOTAL_SLOTS * SLOT_W;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function slotToMinutes(slot: number) {
  return HOUR_START * 60 + slot * SLOT_MIN;
}

function formatDateLabel(d: Date) {
  const today = toISO(new Date());
  const tomorrow = toISO(addDays(new Date(), 1));
  const iso = toISO(d);
  if (iso === today) return "Aujourd'hui";
  if (iso === tomorrow) return "Demain";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function formatTime(t: string) {
  return t.slice(0, 5);
}

// ─── Booking form modal ───────────────────────────────────────────────────────

interface BookingFormProps {
  rooms: BookableRoom[];
  existingBookings: RoomBooking[];
  initialRoom?: BookableRoom;
  initialStart?: number; // minutes from midnight
  date: Date;
  userId: string;
  orgId: string;
  onSave: (b: Omit<RoomBooking, "id" | "created_at">) => Promise<{ error?: string }>;
  onClose: () => void;
}

function BookingFormModal({
  rooms, existingBookings, initialRoom, initialStart, date,
  userId, orgId, onSave, onClose,
}: BookingFormProps) {
  const [roomId, setRoomId]       = useState(initialRoom?.id ?? rooms[0]?.id ?? "");
  const [title, setTitle]         = useState("");
  const [startMin, setStartMin]   = useState(initialStart ?? HOUR_START * 60);
  const [endMin, setEndMin]       = useState((initialStart ?? HOUR_START * 60) + 60);
  const [attendees, setAttendees] = useState(1);
  const [note, setNote]           = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  // Build time options in 30-min increments
  const startOptions = useMemo(() => {
    const opts = [];
    for (let m = HOUR_START * 60; m < HOUR_END * 60; m += SLOT_MIN) {
      opts.push(m);
    }
    return opts;
  }, []);

  const endOptions = useMemo(() => {
    const opts = [];
    for (let m = startMin + SLOT_MIN; m <= HOUR_END * 60; m += SLOT_MIN) {
      opts.push(m);
    }
    return opts;
  }, [startMin]);

  // Check conflict client-side
  function hasConflict(rId: string, sMin: number, eMin: number) {
    return existingBookings.some(
      (b) =>
        b.room_id === rId &&
        toISO(date) === b.date &&
        timeToMinutes(b.start_time) < eMin &&
        timeToMinutes(b.end_time) > sMin
    );
  }

  const conflictWarning = roomId && hasConflict(roomId, startMin, endMin);

  async function handleSave() {
    if (!title.trim() || !roomId) return;
    setSaving(true);
    setError("");
    const result = await onSave({
      room_id: roomId,
      user_id: userId,
      organization_id: orgId,
      title: title.trim(),
      date: toISO(date),
      start_time: minutesToTime(startMin),
      end_time: minutesToTime(endMin),
      attendees_count: attendees,
      note: note.trim() || null,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error.includes("OVERLAP") ? "Ce créneau est déjà réservé." : result.error);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
        style={{
          background: "#13131A",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base" style={{ color: "#F1F5F9", fontFamily: "'Syne', sans-serif" }}>
            Nouvelle réservation
          </h3>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#F1F5F9] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Room select */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#64748B]">Salle</label>
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full h-10 rounded-xl px-3 text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#F1F5F9",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id} style={{ background: "#13131A" }}>
                {r.name} ({r.capacity} pers.)
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#64748B]">Objet de la réunion</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Réunion projet, Stand-up…"
            className="w-full h-10 rounded-xl px-3 text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#F1F5F9",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(99,102,241,0.5)"; }}
            onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; }}
          />
        </div>

        {/* Time range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#64748B]">Début</label>
            <select
              value={startMin}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                setStartMin(v);
                if (endMin <= v) setEndMin(v + SLOT_MIN);
              }}
              className="w-full h-10 rounded-xl px-3 text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#F1F5F9",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {startOptions.map((m) => (
                <option key={m} value={m} style={{ background: "#13131A" }}>
                  {minutesToTime(m)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#64748B]">Fin</label>
            <select
              value={endMin}
              onChange={(e) => setEndMin(parseInt(e.target.value))}
              className="w-full h-10 rounded-xl px-3 text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#F1F5F9",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {endOptions.map((m) => (
                <option key={m} value={m} style={{ background: "#13131A" }}>
                  {minutesToTime(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Conflict warning */}
        {conflictWarning && (
          <p className="text-xs text-amber-400 flex items-center gap-1.5">
            <Clock size={12} />
            Ce créneau chevauche une réservation existante.
          </p>
        )}

        {/* Attendees */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#64748B]">Participants</label>
          <input
            type="number"
            min={1}
            value={attendees}
            onChange={(e) => setAttendees(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full h-10 rounded-xl px-3 text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#F1F5F9",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(99,102,241,0.5)"; }}
            onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; }}
          />
        </div>

        {/* Note */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#64748B]">Note (optionnel)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Informations supplémentaires…"
            className="w-full h-10 rounded-xl px-3 text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#F1F5F9",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(99,102,241,0.5)"; }}
            onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; }}
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl text-sm font-medium"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "#64748B",
              border: "1px solid rgba(255,255,255,0.06)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !title.trim() || !roomId}
            className="flex-1 h-10 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #6366F1, #818CF8)",
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 0 20px rgba(99,102,241,0.3)",
            }}
          >
            {saving ? "Réservation…" : "Réserver"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Booking detail popover ───────────────────────────────────────────────────

interface BookingDetailProps {
  booking: RoomBooking;
  room: BookableRoom;
  booker: Profile | undefined;
  currentUserId: string;
  isAdmin: boolean;
  onCancel: () => void;
  onClose: () => void;
}

function BookingDetail({ booking, room, booker, currentUserId, isAdmin, onCancel, onClose }: BookingDetailProps) {
  const canCancel = booking.user_id === currentUserId || isAdmin;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-xs rounded-2xl p-5 flex flex-col gap-4"
        style={{
          background: "#13131A",
          border: `1px solid ${room.color}44`,
          boxShadow: `0 0 40px ${room.color}22, 0 24px 64px rgba(0,0,0,0.6)`,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-sm text-[#F1F5F9]" style={{ fontFamily: "'Syne', sans-serif" }}>
              {booking.title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: room.color }}>
              {room.name}
            </p>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#F1F5F9] transition-colors mt-0.5">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 text-xs text-[#64748B]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <div className="flex items-center gap-2">
            <Clock size={12} />
            <span>{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={12} />
            <span>{booking.attendees_count} participant{booking.attendees_count > 1 ? "s" : ""}</span>
          </div>
          {booker && (
            <p className="text-[#475569]">Réservé par {booker.display_name}</p>
          )}
          {booking.note && (
            <p className="italic text-[#475569]">{booking.note}</p>
          )}
        </div>

        {canCancel && (
          <button
            onClick={onCancel}
            className="w-full h-9 rounded-xl text-sm font-medium transition-all"
            style={{
              background: "rgba(239,68,68,0.1)",
              color: "#F87171",
              border: "1px solid rgba(239,68,68,0.2)",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
          >
            Annuler la réservation
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Timeline row ─────────────────────────────────────────────────────────────

interface TimelineRowProps {
  room: BookableRoom;
  bookings: RoomBooking[];
  profiles: Map<string, Profile>;
  date: Date;
  onSlotClick: (room: BookableRoom, slotMinutes: number) => void;
  onBookingClick: (booking: RoomBooking) => void;
}

function TimelineRow({ room, bookings, date, onSlotClick, onBookingClick }: TimelineRowProps) {
  const roomBookings = bookings.filter(
    (b) => b.room_id === room.id && b.date === toISO(date)
  );

  return (
    <div className="relative flex" style={{ height: 52 }}>
      {/* Slot grid */}
      {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
        <div
          key={i}
          onClick={() => onSlotClick(room, slotToMinutes(i))}
          className="h-full cursor-pointer transition-colors"
          style={{
            width: SLOT_W,
            borderRight: "1px solid rgba(255,255,255,0.04)",
            background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = `${room.color}10`; }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background =
              i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)";
          }}
        />
      ))}

      {/* Bookings */}
      {roomBookings.map((booking) => {
        const startM = timeToMinutes(booking.start_time);
        const endM   = timeToMinutes(booking.end_time);
        const originM = HOUR_START * 60;
        const left  = ((startM - originM) / SLOT_MIN) * SLOT_W;
        const width = ((endM - startM) / SLOT_MIN) * SLOT_W - 2;

        return (
          <div
            key={booking.id}
            onClick={(e) => { e.stopPropagation(); onBookingClick(booking); }}
            className="absolute top-1 rounded-lg cursor-pointer flex flex-col justify-center px-2.5 overflow-hidden select-none"
            style={{
              left: left + 1,
              width,
              height: 42,
              background: `${room.color}22`,
              border: `1px solid ${room.color}55`,
              boxShadow: `0 0 10px ${room.color}11`,
            }}
          >
            <p
              className="text-xs font-semibold truncate leading-none"
              style={{ color: room.color, fontFamily: "'Syne', sans-serif" }}
            >
              {booking.title}
            </p>
            <p className="text-[10px] mt-0.5 truncate" style={{ color: `${room.color}99`, fontFamily: "'DM Sans', sans-serif" }}>
              {formatTime(booking.start_time)}–{formatTime(booking.end_time)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Current-time indicator ───────────────────────────────────────────────────

function CurrentTimeIndicator({ date }: { date: Date }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (toISO(date) !== toISO(now)) return null;

  const totalM = now.getHours() * 60 + now.getMinutes();
  if (totalM < HOUR_START * 60 || totalM > HOUR_END * 60) return null;

  const left = ((totalM - HOUR_START * 60) / SLOT_MIN) * SLOT_W;

  return (
    <div
      className="absolute top-0 bottom-0 z-10 pointer-events-none"
      style={{ left: LABEL_W + left }}
    >
      <div className="absolute top-0 bottom-0 w-px bg-[#6366F1] opacity-70" />
      <div className="absolute -top-1.5 -left-1 w-2 h-2 rounded-full bg-[#6366F1]" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoomsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [currentUser, setCurrentUser]   = useState<Profile | null>(null);
  const [orgId, setOrgId]               = useState<string | null>(null);
  const [rooms, setRooms]               = useState<BookableRoom[]>([]);
  const [bookings, setBookings]         = useState<RoomBooking[]>([]);
  const [profiles, setProfiles]         = useState<Map<string, Profile>>(new Map());
  const [date, setDate]                 = useState(() => new Date());
  const [loading, setLoading]           = useState(true);
  const [bookingForm, setBookingForm]   = useState<{ room?: BookableRoom; startMin?: number } | null>(null);
  const [detailBooking, setDetailBooking] = useState<RoomBooking | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === "admin";

  // Bootstrap
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();

      if (!prof?.organization_id) return;
      setCurrentUser(prof);
      setOrgId(prof.organization_id);

      const [{ data: roomsData }, { data: membersData }] = await Promise.all([
        supabase.from("bookable_rooms").select("*")
          .eq("organization_id", prof.organization_id)
          .eq("is_active", true)
          .order("name"),
        supabase.from("profiles").select("*")
          .eq("organization_id", prof.organization_id),
      ]);

      setRooms(roomsData ?? []);
      const pm = new Map((membersData ?? []).map((p) => [p.id, p]));
      setProfiles(pm);
    }

    void init();
  }, [supabase]);

  // Fetch bookings when date or orgId changes
  const fetchBookings = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

    // Fetch ±1 day buffer for smooth navigation
    const from = toISO(addDays(date, -1));
    const to   = toISO(addDays(date, 1));
    const { data } = await supabase
      .from("room_bookings").select("*")
      .eq("organization_id", orgId)
      .gte("date", from)
      .lte("date", to)
      .order("start_time");

    setBookings(data ?? []);
    setLoading(false);
  }, [orgId, date, supabase]);

  useEffect(() => { void fetchBookings(); }, [fetchBookings]);

  // Scroll to ~current time on mount (or 8:00 for future days)
  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const isToday = toISO(date) === toISO(now);
    const targetM = isToday
      ? Math.max(now.getHours() * 60 + now.getMinutes() - 60, HOUR_START * 60)
      : HOUR_START * 60;
    const scrollX = ((targetM - HOUR_START * 60) / SLOT_MIN) * SLOT_W;
    scrollRef.current.scrollLeft = Math.max(0, scrollX);
  }, [date, rooms.length]);

  async function handleCreateBooking(data: Omit<RoomBooking, "id" | "created_at">) {
    const { error } = await supabase.from("room_bookings").insert(data);
    if (error) return { error: error.message };
    setBookingForm(null);
    await fetchBookings();
    return {};
  }

  async function handleCancelBooking(id: string) {
    await supabase.from("room_bookings").delete().eq("id", id);
    setDetailBooking(null);
    await fetchBookings();
  }

  const detailRoom = detailBooking
    ? rooms.find((r) => r.id === detailBooking.room_id)
    : undefined;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0A0A0F" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div>
          <h1
            className="font-bold text-xl"
            style={{ color: "#F1F5F9", fontFamily: "'Syne', sans-serif" }}
          >
            Salles de réunion
          </h1>
          <p
            className="text-sm mt-0.5 capitalize"
            style={{ color: "#64748B", fontFamily: "'DM Sans', sans-serif" }}
          >
            {formatDateLabel(date)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDate((d) => addDays(d, -1))}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", color: "#64748B", border: "1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#F1F5F9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setDate(new Date())}
              className="flex items-center justify-center h-8 px-3 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", color: "#64748B", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#F1F5F9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; }}
            >
              Aujourd&apos;hui
            </button>
            <button
              onClick={() => setDate((d) => addDays(d, 1))}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", color: "#64748B", border: "1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#F1F5F9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* New booking */}
          <button
            onClick={() => setBookingForm({})}
            className="flex items-center gap-2 h-8 px-3 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #6366F1, #818CF8)",
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 0 16px rgba(99,102,241,0.25)",
            }}
          >
            <Plus size={14} />
            Réserver
          </button>
        </div>
      </div>

      {/* No rooms state */}
      {!loading && rooms.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <DoorOpen size={40} className="text-[#1E1E2E]" />
          <p className="text-[#64748B] text-sm">Aucune salle configurée.</p>
          {isAdmin && (
            <a
              href="/dashboard/settings/rooms"
              className="text-sm font-medium text-[#6366F1] hover:text-[#818CF8] transition-colors"
            >
              Configurer les salles →
            </a>
          )}
        </div>
      )}

      {/* Timeline */}
      {rooms.length > 0 && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Container with sticky left column + scrollable right */}
          <div className="flex-1 overflow-hidden relative">
            <CurrentTimeIndicator date={date} />

            <div className="h-full flex">
              {/* Sticky left: room names */}
              <div
                className="shrink-0 flex flex-col"
                style={{
                  width: LABEL_W,
                  borderRight: "1px solid rgba(255,255,255,0.06)",
                  zIndex: 2,
                  background: "#0A0A0F",
                }}
              >
                {/* Corner spacer (aligned with hour header) */}
                <div
                  className="shrink-0 flex items-end px-4 pb-1"
                  style={{ height: 36, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="text-[10px] font-semibold text-[#334155] uppercase tracking-wider">
                    {rooms.length} salle{rooms.length > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Room rows */}
                <div className="overflow-y-auto flex-1">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center gap-3 px-4"
                      style={{
                        height: 52,
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: room.color }}
                      />
                      <div className="min-w-0">
                        <p
                          className="text-xs font-semibold truncate"
                          style={{ color: "#F1F5F9", fontFamily: "'Syne', sans-serif" }}
                        >
                          {room.name}
                        </p>
                        <p
                          className="text-[10px] text-[#475569]"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {room.capacity} pers.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scrollable right: timeline */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-x-auto overflow-y-auto"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#1E1E2E transparent" }}
              >
                <div style={{ width: TIMELINE_W, minWidth: TIMELINE_W }}>
                  {/* Hour header */}
                  <div
                    className="flex sticky top-0 z-10"
                    style={{
                      height: 36,
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      background: "#0A0A0F",
                    }}
                  >
                    {Array.from({ length: TOTAL_SLOTS / 2 }).map((_, i) => {
                      const hour = HOUR_START + i;
                      const isNowHour =
                        toISO(date) === toISO(new Date()) &&
                        new Date().getHours() === hour;
                      return (
                        <div
                          key={i}
                          className="flex items-end pb-1 pl-2"
                          style={{ width: SLOT_W * 2, borderRight: "1px solid rgba(255,255,255,0.04)" }}
                        >
                          <span
                            className="text-[10px] font-semibold"
                            style={{
                              color: isNowHour ? "#6366F1" : "#334155",
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            {String(hour).padStart(2, "0")}:00
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Room rows */}
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <TimelineRow
                        room={room}
                        bookings={bookings}
                        profiles={profiles}
                        date={date}
                        onSlotClick={(r, m) => setBookingForm({ room: r, startMin: m })}
                        onBookingClick={setDetailBooking}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div
            className="shrink-0 px-6 py-2 flex items-center gap-2 text-xs"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "#334155", fontFamily: "'DM Sans', sans-serif" }}
          >
            <span>Cliquez sur un créneau pour réserver · Cliquez sur une réservation pour voir les détails</span>
          </div>
        </div>
      )}

      {/* Booking form modal */}
      {bookingForm !== null && currentUser && orgId && rooms.length > 0 && (
        <BookingFormModal
          rooms={rooms}
          existingBookings={bookings}
          initialRoom={bookingForm.room}
          initialStart={bookingForm.startMin}
          date={date}
          userId={currentUser.id}
          orgId={orgId}
          onSave={handleCreateBooking}
          onClose={() => setBookingForm(null)}
        />
      )}

      {/* Booking detail */}
      {detailBooking && detailRoom && currentUser && (
        <BookingDetail
          booking={detailBooking}
          room={detailRoom}
          booker={profiles.get(detailBooking.user_id)}
          currentUserId={currentUser.id}
          isAdmin={isAdmin}
          onCancel={() => void handleCancelBooking(detailBooking.id)}
          onClose={() => setDetailBooking(null)}
        />
      )}
    </div>
  );
}
