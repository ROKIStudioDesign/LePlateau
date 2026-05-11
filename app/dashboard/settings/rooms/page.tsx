"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BookableRoom, Zone, Profile } from "@/lib/types/database";
import { DoorOpen, Plus, Pencil, Trash2, X, Save, Users, Tv, Projector, Monitor, Video } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROOM_COLORS = [
  "#6366F1", "#22D3EE", "#10B981", "#F59E0B",
  "#8B5CF6", "#EC4899", "#EF4444", "#14B8A6",
];

const EQUIPMENT_OPTIONS = [
  { key: "projector",    label: "Projecteur",       icon: Projector },
  { key: "tv",           label: "Écran TV",          icon: Tv },
  { key: "whiteboard",   label: "Tableau blanc",     icon: Monitor },
  { key: "visio",        label: "Visioconférence",   icon: Video },
  { key: "phone",        label: "Téléphone conf.",   icon: Users },
];

// ─── Room form modal ──────────────────────────────────────────────────────────

interface RoomFormProps {
  initial: Partial<BookableRoom> | null;
  zones: Zone[];
  orgId: string;
  onSave: (data: Omit<BookableRoom, "id" | "created_at">) => Promise<void>;
  onClose: () => void;
}

function RoomFormModal({ initial, zones, orgId, onSave, onClose }: RoomFormProps) {
  const [name, setName]           = useState(initial?.name ?? "");
  const [capacity, setCapacity]   = useState(initial?.capacity ?? 4);
  const [equipment, setEquipment] = useState<string[]>(initial?.equipment ?? []);
  const [color, setColor]         = useState(initial?.color ?? "#6366F1");
  const [zoneId, setZoneId]       = useState<string>(initial?.zone_id ?? "");
  const [isActive, setIsActive]   = useState(initial?.is_active ?? true);
  const [saving, setSaving]       = useState(false);

  function toggleEquipment(key: string) {
    setEquipment((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({
      organization_id: orgId,
      zone_id: zoneId || null,
      name: name.trim(),
      capacity,
      equipment,
      color,
      is_active: isActive,
    });
    setSaving(false);
  }

  const meetingZones = zones.filter((z) => z.type === "meeting_room");

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
            {initial?.id ? "Modifier la salle" : "Nouvelle salle"}
          </h3>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#F1F5F9] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#64748B]">Nom de la salle</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Salle Apollo, Salle B…"
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

        {/* Capacity */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#64748B]">Capacité (personnes)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={capacity}
            onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
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

        {/* Equipment */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#64748B]">Équipements</label>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map(({ key, label }) => {
              const active = equipment.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleEquipment(key)}
                  className="h-7 px-3 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: active ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                    color: active ? "#818CF8" : "#64748B",
                    border: `1px solid ${active ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)"}`,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Color */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#64748B]">Couleur</label>
          <div className="flex items-center gap-2 flex-wrap">
            {ROOM_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-transform duration-100"
                style={{
                  background: c,
                  outline: color === c ? `2px solid ${c}` : "none",
                  outlineOffset: 2,
                  transform: color === c ? "scale(1.15)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Linked zone */}
        {meetingZones.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#64748B]">Zone liée sur le plan</label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="w-full h-10 rounded-xl px-3 text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: zoneId ? "#F1F5F9" : "#64748B",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <option value="">— Aucune zone liée —</option>
              {meetingZones.map((z) => (
                <option key={z.id} value={z.id} style={{ background: "#13131A" }}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#64748B]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Salle active (réservable)
          </span>
          <button
            onClick={() => setIsActive((v) => !v)}
            className={cn(
              "relative w-10 h-5 rounded-full transition-colors duration-200",
              isActive ? "bg-[#6366F1]" : "bg-[#1E1E2E]"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200",
                isActive ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
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
            disabled={saving || !name.trim()}
            className="flex-1 h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #6366F1, #818CF8)",
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 0 20px rgba(99,102,241,0.3)",
            }}
          >
            <Save size={14} />
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoomsSettingsPage() {
  const [rooms, setRooms]   = useState<BookableRoom[]>([]);
  const [zones, setZones]   = useState<Zone[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orgId, setOrgId]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<BookableRoom> | null | "new">(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const isAdmin = profile?.role === "admin";

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase
      .from("profiles").select("*").eq("id", user.id).single();

    if (!prof?.organization_id) return;
    setProfile(prof);
    setOrgId(prof.organization_id);

    const [{ data: roomsData }, { data: zonesData }] = await Promise.all([
      supabase.from("bookable_rooms").select("*")
        .eq("organization_id", prof.organization_id)
        .order("created_at"),
      supabase.from("zones").select("*").order("name"),
    ]);

    setRooms(roomsData ?? []);
    setZones(zonesData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleSave(data: Omit<BookableRoom, "id" | "created_at">) {
    const supabase = createClient();
    if (editing && typeof editing === "object" && editing.id) {
      await supabase.from("bookable_rooms").update(data).eq("id", editing.id);
    } else {
      await supabase.from("bookable_rooms").insert(data);
    }
    setEditing(null);
    await load();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const supabase = createClient();
    await supabase.from("bookable_rooms").delete().eq("id", id);
    setDeleting(null);
    setRooms((prev) => prev.filter((r) => r.id !== id));
  }

  const zoneMap = new Map(zones.map((z) => [z.id, z]));

  if (loading) {
    return (
      <div className="p-8 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-[#13131A] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9]" style={{ fontFamily: "Syne, sans-serif" }}>
            Salles de réunion
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            {isAdmin
              ? "Gérez les salles réservables de votre organisation."
              : "Consultez les salles disponibles dans votre organisation."}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setEditing("new")}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #6366F1, #818CF8)",
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 0 16px rgba(99,102,241,0.25)",
            }}
          >
            <Plus size={15} />
            Ajouter une salle
          </button>
        )}
      </div>

      {rooms.length === 0 ? (
        <div
          className="rounded-xl p-10 flex flex-col items-center gap-3 text-center"
          style={{ background: "#13131A", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <DoorOpen size={32} className="text-[#1E1E2E]" />
          <p className="text-[#64748B] text-sm">Aucune salle configurée.</p>
          {isAdmin && (
            <button
              onClick={() => setEditing("new")}
              className="mt-1 text-sm font-medium text-[#6366F1] hover:text-[#818CF8] transition-colors"
            >
              + Ajouter la première salle
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => {
            const linkedZone = room.zone_id ? zoneMap.get(room.zone_id) : null;
            return (
              <div
                key={room.id}
                className="rounded-xl p-4 flex items-center gap-4"
                style={{
                  background: "#13131A",
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
                  opacity: room.is_active ? 1 : 0.5,
                }}
              >
                {/* Color dot */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${room.color}22`, border: `1.5px solid ${room.color}55` }}
                >
                  <DoorOpen size={18} style={{ color: room.color }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-[#F1F5F9] truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {room.name}
                    </p>
                    {!room.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E1E2E] text-[#64748B]">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-[#64748B]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {room.capacity} pers.
                    </span>
                    {linkedZone && (
                      <span className="text-xs text-[#64748B]">· {linkedZone.name}</span>
                    )}
                    {room.equipment.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {room.equipment.map((eq) => (
                          <span
                            key={eq}
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(255,255,255,0.05)", color: "#64748B" }}
                          >
                            {EQUIPMENT_OPTIONS.find((o) => o.key === eq)?.label ?? eq}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditing(room)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-[#64748B] hover:text-[#F1F5F9] hover:bg-white/5 transition-all"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => void handleDelete(room.id)}
                      disabled={deleting === room.id}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-[#64748B] hover:text-red-400 hover:bg-red-400/5 transition-all disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Create modal */}
      {editing !== null && orgId && (
        <RoomFormModal
          initial={editing === "new" ? null : editing}
          zones={zones}
          orgId={orgId}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
