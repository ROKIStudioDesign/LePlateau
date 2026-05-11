"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Download, FileText, CalendarDays, DoorOpen, Loader2 } from "lucide-react";
import type { WorkScheduleStatus } from "@/lib/types/database";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<WorkScheduleStatus, string> = {
  office: "Bureau",
  remote: "Télétravail",
  vacation: "Congés",
  sick: "Maladie",
  absent: "Absent",
  rtt: "RTT",
};

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function firstDayOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  return toISO(d);
}

function today(): string {
  return toISO(new Date());
}

function triggerDownload(content: string, filename: string, type = "text/csv;charset=utf-8;") {
  const bom = "﻿"; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([bom + content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ─── Export card ──────────────────────────────────────────────────────────────

interface ExportCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onExport: () => Promise<void>;
  loading: boolean;
}

function ExportCard({ icon, title, description, onExport, loading }: ExportCardProps) {
  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4"
      style={{
        background: "#13131A",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "rgba(99,102,241,0.12)", color: "#818CF8" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="font-semibold text-sm"
          style={{ color: "#F1F5F9", fontFamily: "'Syne', sans-serif" }}
        >
          {title}
        </p>
        <p
          className="text-xs mt-1"
          style={{ color: "#64748B", fontFamily: "'DM Sans', sans-serif" }}
        >
          {description}
        </p>
      </div>
      <button
        onClick={onExport}
        disabled={loading}
        className="flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold transition-all shrink-0 disabled:opacity-60"
        style={{
          background: "rgba(99,102,241,0.15)",
          color: "#818CF8",
          border: "1px solid rgba(99,102,241,0.3)",
          fontFamily: "'DM Sans', sans-serif",
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.background = "rgba(99,102,241,0.25)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(99,102,241,0.15)";
        }}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}
        Exporter CSV
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type LoadState = "loading" | "ready" | "forbidden";

export default function ExportPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingPresence, setLoadingPresence] = useState(false);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, organization_id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      if (profile.role !== "admin") {
        setLoadState("forbidden");
        return;
      }

      if (!profile.organization_id) {
        setLoadState("forbidden");
        return;
      }

      setOrgId(profile.organization_id);
      setLoadState("ready");
    }

    void init();
  }, []);

  async function exportSchedules() {
    if (!orgId) return;
    setLoadingSchedules(true);
    try {
      const supabase = createClient();

      const [{ data: profiles }, { data: schedules }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, role")
          .eq("organization_id", orgId)
          .order("display_name"),
        supabase
          .from("work_schedules")
          .select("user_id, date, status, note")
          .eq("organization_id", orgId)
          .gte("date", dateFrom)
          .lte("date", dateTo)
          .order("date")
          .order("user_id"),
      ]);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      const header = ["Date", "Membre", "Rôle", "Statut", "Note"];
      const rows = (schedules ?? []).map((row) => {
        const p = profileMap.get(row.user_id);
        return [
          escapeCSV(row.date),
          escapeCSV(p?.display_name),
          escapeCSV(p?.role === "admin" ? "Administrateur" : "Membre"),
          escapeCSV(STATUS_LABELS[row.status as WorkScheduleStatus] ?? row.status),
          escapeCSV(row.note),
        ];
      });

      const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
      triggerDownload(csv, `planning_${dateFrom}_${dateTo}.csv`);
    } finally {
      setLoadingSchedules(false);
    }
  }

  async function exportBookings() {
    if (!orgId) return;
    setLoadingBookings(true);
    try {
      const supabase = createClient();

      const [{ data: profiles }, { data: rooms }, { data: bookings }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name")
          .eq("organization_id", orgId),
        supabase
          .from("bookable_rooms")
          .select("id, name")
          .eq("organization_id", orgId),
        supabase
          .from("room_bookings")
          .select("room_id, user_id, date, start_time, end_time, title, attendees_count, note")
          .eq("organization_id", orgId)
          .gte("date", dateFrom)
          .lte("date", dateTo)
          .order("date")
          .order("start_time"),
      ]);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const roomMap = new Map((rooms ?? []).map((r) => [r.id, r]));

      const header = ["Date", "Salle", "Titre", "Organisateur", "Début", "Fin", "Participants", "Note"];
      const rows = (bookings ?? []).map((row) => {
        const room = roomMap.get(row.room_id);
        const organizer = profileMap.get(row.user_id);
        return [
          escapeCSV(row.date),
          escapeCSV(room?.name),
          escapeCSV(row.title),
          escapeCSV(organizer?.display_name),
          escapeCSV(row.start_time?.slice(0, 5)),
          escapeCSV(row.end_time?.slice(0, 5)),
          escapeCSV(String(row.attendees_count)),
          escapeCSV(row.note),
        ];
      });

      const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
      triggerDownload(csv, `reservations_${dateFrom}_${dateTo}.csv`);
    } finally {
      setLoadingBookings(false);
    }
  }

  async function exportPresence() {
    if (!orgId) return;
    setLoadingPresence(true);
    try {
      const supabase = createClient();

      const [{ data: members }, { data: schedules }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, role")
          .eq("organization_id", orgId)
          .order("display_name"),
        supabase
          .from("work_schedules")
          .select("user_id, status")
          .eq("organization_id", orgId)
          .gte("date", dateFrom)
          .lte("date", dateTo),
      ]);

      const counts = new Map<string, Record<WorkScheduleStatus, number>>();
      for (const s of schedules ?? []) {
        if (!counts.has(s.user_id)) {
          counts.set(s.user_id, { office: 0, remote: 0, vacation: 0, sick: 0, absent: 0, rtt: 0 });
        }
        const c = counts.get(s.user_id)!;
        const key = s.status as WorkScheduleStatus;
        if (key in c) c[key]++;
      }

      const statusKeys: WorkScheduleStatus[] = ["office", "remote", "vacation", "sick", "absent", "rtt"];
      const header = [
        "Membre",
        "Rôle",
        ...statusKeys.map((k) => STATUS_LABELS[k]),
        "Total jours renseignés",
      ];

      const rows = (members ?? []).map((m) => {
        const c = counts.get(m.id) ?? { office: 0, remote: 0, vacation: 0, sick: 0, absent: 0, rtt: 0 };
        const total = statusKeys.reduce((sum, k) => sum + c[k], 0);
        return [
          escapeCSV(m.display_name),
          escapeCSV(m.role === "admin" ? "Administrateur" : "Membre"),
          ...statusKeys.map((k) => String(c[k])),
          String(total),
        ];
      });

      const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
      triggerDownload(csv, `presence_${dateFrom}_${dateTo}.csv`);
    } finally {
      setLoadingPresence(false);
    }
  }

  if (loadState === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (loadState === "forbidden") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <FileText size={32} className="text-[#334155]" />
        <p className="font-semibold text-[#F1F5F9]" style={{ fontFamily: "'Syne', sans-serif" }}>
          Accès réservé aux administrateurs
        </p>
        <p className="text-sm text-[#64748B]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Seuls les admins peuvent exporter les données RH.
        </p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#F1F5F9",
    fontFamily: "'DM Sans', sans-serif",
    colorScheme: "dark",
  };

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-xl font-bold"
          style={{ color: "#F1F5F9", fontFamily: "'Syne', sans-serif" }}
        >
          Export RH
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: "#64748B", fontFamily: "'DM Sans', sans-serif" }}
        >
          Téléchargez les données de présence et de réservation en CSV.
        </p>
      </div>

      {/* Date range */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{
          background: "#13131A",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "#475569", fontFamily: "'DM Sans', sans-serif" }}
        >
          Période
        </p>
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1.5 flex-1">
            <label
              className="text-xs font-medium"
              style={{ color: "#64748B", fontFamily: "'DM Sans', sans-serif" }}
            >
              Du
            </label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded-xl px-3 text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label
              className="text-xs font-medium"
              style={{ color: "#64748B", fontFamily: "'DM Sans', sans-serif" }}
            >
              Au
            </label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded-xl px-3 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          {/* Quick shortcuts */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <label
              className="text-xs font-medium"
              style={{ color: "#64748B", fontFamily: "'DM Sans', sans-serif" }}
            >
              Raccourcis
            </label>
            <div className="flex gap-2">
              {[
                {
                  label: "Ce mois",
                  action: () => {
                    setDateFrom(firstDayOfMonth());
                    setDateTo(today());
                  },
                },
                {
                  label: "3 mois",
                  action: () => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - 3);
                    setDateFrom(toISO(d));
                    setDateTo(today());
                  },
                },
                {
                  label: "Cette année",
                  action: () => {
                    setDateFrom(`${new Date().getFullYear()}-01-01`);
                    setDateTo(today());
                  },
                },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="h-9 px-3 rounded-xl text-xs font-medium transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    color: "#64748B",
                    border: "1px solid rgba(255,255,255,0.06)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#F1F5F9";
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#64748B";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Export options */}
      <div className="space-y-3">
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "#475569", fontFamily: "'DM Sans', sans-serif" }}
        >
          Données à exporter
        </p>

        <ExportCard
          icon={<CalendarDays size={18} />}
          title="Planning équipe"
          description="Tous les statuts de présence (bureau, télétravail, congés…) par membre et par jour sur la période."
          onExport={exportSchedules}
          loading={loadingSchedules}
        />

        <ExportCard
          icon={<DoorOpen size={18} />}
          title="Réservations de salles"
          description="Toutes les réservations de salles avec organisateur, horaires et nombre de participants."
          onExport={exportBookings}
          loading={loadingBookings}
        />

        <ExportCard
          icon={<FileText size={18} />}
          title="Synthèse présence"
          description="Nombre de jours par type de statut par membre — idéal pour les bilans RH mensuels."
          onExport={exportPresence}
          loading={loadingPresence}
        />
      </div>

      {/* Note */}
      <p
        className="text-xs"
        style={{ color: "#334155", fontFamily: "'DM Sans', sans-serif" }}
      >
        Les fichiers CSV sont encodés en UTF-8 avec BOM pour une compatibilité optimale avec Excel.
      </p>
    </div>
  );
}
