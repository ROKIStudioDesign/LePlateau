"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BookableRoom, Zone, Profile } from "@/lib/types/database";
import { DoorOpen, Plus, Pencil, Trash2, X, Save, Users, Tv, Projector, Monitor, Video } from "lucide-react";

const ROOM_COLORS = ["#5B5BD6", "#0EA5E9", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#EF4444", "#14B8A6"];

const EQUIPMENT_OPTIONS = [
  { key: "projector", label: "Projecteur", icon: Projector },
  { key: "tv",        label: "Écran TV",   icon: Tv },
  { key: "whiteboard",label: "Tableau blanc",icon: Monitor },
  { key: "visio",     label: "Visioconférence", icon: Video },
  { key: "phone",     label: "Téléphone conf.", icon: Users },
];

const inputStyle = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border-primary)",
  color: "var(--text-primary)",
  fontFamily: "'DM Sans', sans-serif",
};

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
  const [color, setColor]         = useState(initial?.color ?? "#5B5BD6");
  const [zoneId, setZoneId]       = useState<string>(initial?.zone_id ?? "");
  const [isActive, setIsActive]   = useState(initial?.is_active ?? true);
  const [saving, setSaving]       = useState(false);

  function toggleEquipment(key: string) {
    setEquipment((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ organization_id: orgId, zone_id: zoneId || null, name: name.trim(), capacity, equipment, color, is_active: isActive });
    setSaving(false);
  }

  const meetingZones = zones.filter((z) => z.type === "meeting_room");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 flex flex-col gap-5"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base" style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}>
            {initial?.id ? "Modifier la salle" : "Nouvelle salle"}
          </h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}>
            <X size={18} />
          </button>
        </div>

        {[
          { label: "Nom de la salle", value: name, onChange: (v: string) => setName(v), type: "text", placeholder: "Ex: Salle Apollo, Salle B…" },
          { label: "Capacité (personnes)", value: String(capacity), onChange: (v: string) => setCapacity(Math.max(1, parseInt(v) || 1)), type: "number" },
        ].map(({ label, value, onChange, type, placeholder }) => (
          <div key={label} className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</label>
            <input
              type={type} value={value} onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full h-10 rounded-lg px-3 text-sm outline-none"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.border = "1px solid var(--accent-primary)"; }}
              onBlur={(e) => { e.currentTarget.style.border = "1px solid var(--border-primary)"; }}
            />
          </div>
        ))}

        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Équipements</label>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map(({ key, label }) => {
              const active = equipment.includes(key);
              return (
                <button key={key} onClick={() => toggleEquipment(key)}
                  className="h-7 px-3 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: active ? "var(--accent-light)" : "var(--bg-secondary)",
                    color: active ? "var(--accent-primary)" : "var(--text-secondary)",
                    border: `1px solid ${active ? "var(--accent-primary)" : "var(--border-primary)"}`,
                  }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Couleur</label>
          <div className="flex items-center gap-2 flex-wrap">
            {ROOM_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-transform duration-100"
                style={{ background: c, outline: color === c ? `2px solid ${c}` : "none", outlineOffset: 2, transform: color === c ? "scale(1.15)" : "scale(1)" }}
              />
            ))}
          </div>
        </div>

        {meetingZones.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Zone liée sur le plan</label>
            <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}
              className="w-full h-10 rounded-lg px-3 text-sm outline-none"
              style={{ ...inputStyle, color: zoneId ? "var(--text-primary)" : "var(--text-muted)" }}>
              <option value="">— Aucune zone liée —</option>
              {meetingZones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Salle active (réservable)</span>
          <button onClick={() => setIsActive((v) => !v)}
            className="relative w-10 h-5 rounded-full transition-colors duration-200"
            style={{ background: isActive ? "var(--accent-primary)" : "var(--bg-tertiary)" }}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${isActive ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg text-sm font-medium"
            style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-primary)" }}>
            Annuler
          </button>
          <button onClick={() => void handleSave()} disabled={saving || !name.trim()}
            className="flex-1 h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            style={{ background: "var(--accent-primary)", color: "white" }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "var(--accent-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent-primary)"; }}>
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
  const [rooms, setRooms]     = useState<BookableRoom[]>([]);
  const [zones, setZones]     = useState<Zone[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orgId, setOrgId]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<BookableRoom> | null | "new">(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const isAdmin = profile?.role === "admin";

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!prof?.organization_id) return;
    setProfile(prof); setOrgId(prof.organization_id);
    const [{ data: roomsData }, { data: zonesData }] = await Promise.all([
      supabase.from("bookable_rooms").select("*").eq("organization_id", prof.organization_id).order("created_at"),
      supabase.from("zones").select("*").order("name"),
    ]);
    setRooms(roomsData ?? []); setZones(zonesData ?? []); setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleSave(data: Omit<BookableRoom, "id" | "created_at">) {
    const supabase = createClient();
    if (editing && typeof editing === "object" && editing.id) {
      await supabase.from("bookable_rooms").update(data).eq("id", editing.id);
    } else {
      await supabase.from("bookable_rooms").insert(data);
    }
    setEditing(null); await load();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await createClient().from("bookable_rooms").delete().eq("id", id);
    setDeleting(null);
    setRooms((prev) => prev.filter((r) => r.id !== id));
  }

  const zoneMap = new Map(zones.map((z) => [z.id, z]));

  if (loading) {
    return (
      <div className="p-8 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--bg-tertiary)" }} />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "Syne, sans-serif" }}>Salles de réunion</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {isAdmin ? "Gérez les salles réservables de votre organisation." : "Consultez les salles disponibles."}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setEditing("new")}
            className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: "var(--accent-primary)", color: "white" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent-primary)"; }}>
            <Plus size={15} /> Ajouter une salle
          </button>
        )}
      </div>

      {rooms.length === 0 ? (
        <div className="rounded-xl p-10 flex flex-col items-center gap-3 text-center"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border-primary)" }}>
          <DoorOpen size={32} style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Aucune salle configurée.</p>
          {isAdmin && (
            <button onClick={() => setEditing("new")} className="mt-1 text-sm font-medium transition-colors"
              style={{ color: "var(--accent-primary)" }}>
              + Ajouter la première salle
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => {
            const linkedZone = room.zone_id ? zoneMap.get(room.zone_id) : null;
            return (
              <div key={room.id} className="rounded-lg p-4 flex items-center gap-4"
                style={{
                  background: "var(--bg-primary)", border: "1px solid var(--border-primary)",
                  boxShadow: "var(--shadow-sm)", opacity: room.is_active ? 1 : 0.55,
                }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${room.color}1A`, border: `1.5px solid ${room.color}55` }}>
                  <DoorOpen size={18} style={{ color: room.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}>{room.name}</p>
                    {!room.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>Inactive</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{room.capacity} pers.</span>
                    {linkedZone && <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {linkedZone.name}</span>}
                    {room.equipment.map((eq) => (
                      <span key={eq} className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
                        {EQUIPMENT_OPTIONS.find((o) => o.key === eq)?.label ?? eq}
                      </span>
                    ))}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditing(room)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "var(--bg-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => void handleDelete(room.id)} disabled={deleting === room.id}
                      className="flex items-center justify-center w-8 h-8 rounded-lg transition-all disabled:opacity-40"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.background = "var(--danger-light)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing !== null && orgId && (
        <RoomFormModal initial={editing === "new" ? null : editing} zones={zones} orgId={orgId} onSave={handleSave} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
