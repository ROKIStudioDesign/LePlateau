"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Organization, AvatarPosition, Zone } from "@/lib/types/database";
import { cn, getInitials } from "@/lib/utils";
import { UserPlus, Trash2, Shield, User, MapPin, Clock } from "lucide-react";

function formatLastSeen(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `il y a ${days} j`;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [positions, setPositions] = useState<Map<string, AvatarPosition>>(new Map());
  const [zones, setZones] = useState<Map<string, Zone>>(new Map());
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) return;
    setCurrentProfile(profile);

    const { data: orgData } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", profile.organization_id!)
      .single();

    setOrg(orgData);

    const { data: membersData } = await supabase
      .from("profiles")
      .select("*")
      .eq("organization_id", profile.organization_id!)
      .order("created_at");

    setMembers(membersData ?? []);

    // Fetch office map to get positions + zones
    const { data: mapData } = await supabase
      .from("office_maps")
      .select("id")
      .eq("organization_id", profile.organization_id!)
      .order("created_at")
      .limit(1)
      .single();

    if (mapData) {
      const [{ data: posData }, { data: zonesData }] = await Promise.all([
        supabase
          .from("avatar_positions")
          .select("*")
          .eq("office_map_id", mapData.id),
        supabase
          .from("zones")
          .select("*")
          .eq("office_map_id", mapData.id),
      ]);

      setPositions(new Map((posData ?? []).map((p) => [p.user_id, p])));
      setZones(new Map((zonesData ?? []).map((z) => [z.id, z])));
    }

    setLoading(false);
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    setInviteSuccess(false);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: [inviteEmail.trim()] }),
      });
      if (!res.ok) throw new Error("Échec de l'invitation");
      setInviteEmail("");
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Erreur");
    }
    setInviting(false);
  }

  async function handleRoleChange(memberId: string, newRole: "admin" | "member") {
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", memberId);
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Retirer ce membre de l'organisation ?")) return;
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ organization_id: null })
      .eq("id", memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }

  if (loading) {
    return (
      <div className="p-8 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-[#13131A] animate-pulse" />
        ))}
      </div>
    );
  }

  const isAdmin = currentProfile?.role === "admin";

  return (
    <div className="p-8 max-w-4xl space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[#F1F5F9]"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Membres
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            {members.length} / {org?.max_users ?? "?"} membres
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@exemple.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleInvite()}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm text-[#F1F5F9]",
                  "bg-[#13131A] border border-[#1E1E2E]",
                  "focus:outline-none focus:ring-2 focus:ring-[#6366F1]",
                  "placeholder:text-[#64748B] w-56"
                )}
              />
              <button
                onClick={() => void handleInvite()}
                disabled={inviting || !inviteEmail.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#6366F1] text-white hover:bg-[#5254cc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <UserPlus size={14} />
                {inviting ? "…" : "Inviter"}
              </button>
            </div>
            {inviteError && (
              <p className="text-xs text-red-400">{inviteError}</p>
            )}
            {inviteSuccess && (
              <p className="text-xs text-emerald-400">Invitation envoyée ✓</p>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-dashed border-[#1E1E2E] text-center">
          <User size={32} className="text-[#64748B] mb-3" />
          <p className="text-sm text-[#64748B]">Aucun membre pour l&apos;instant.</p>
          {isAdmin && (
            <p className="text-xs text-[#64748B] mt-1">
              Invitez des collègues via le formulaire ci-dessus.
            </p>
          )}
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: "#13131A",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1E1E2E]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase tracking-wider">
                  Membre
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase tracking-wider">
                  Rôle
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} />
                    Zone actuelle
                  </span>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    Vu
                  </span>
                </th>
                {isAdmin && <th className="px-4 py-3 w-16" />}
              </tr>
            </thead>
            <tbody>
              {members.map((member, i) => {
                const pos = positions.get(member.id);
                const zone = pos?.zone_id ? zones.get(pos.zone_id) : undefined;
                const isOnline = pos?.is_online ?? false;

                return (
                  <tr
                    key={member.id}
                    className={cn(
                      "transition-colors hover:bg-[#1E1E2E]/40",
                      i !== members.length - 1 && "border-b border-[#1E1E2E]/50"
                    )}
                  >
                    {/* Avatar + name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white overflow-hidden"
                            style={{
                              background: `hsl(${(member.id.charCodeAt(0) * 37) % 360}, 60%, 45%)`,
                            }}
                          >
                            {member.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={member.avatar_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              getInitials(member.display_name)
                            )}
                          </div>
                          {/* Online indicator */}
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#13131A]",
                              isOnline ? "bg-emerald-400" : "bg-[#64748B]"
                            )}
                          />
                        </div>
                        <span className="text-sm text-[#F1F5F9]">
                          {member.display_name}
                          {member.id === currentProfile?.id && (
                            <span className="ml-1 text-xs text-[#64748B]">(vous)</span>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      {isAdmin && member.id !== currentProfile?.id ? (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            void handleRoleChange(
                              member.id,
                              e.target.value as "admin" | "member"
                            )
                          }
                          className="text-xs px-2 py-1 rounded bg-[#0A0A0F] border border-[#1E1E2E] text-[#F1F5F9] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                        >
                          <option value="member">Membre</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span
                          className={cn(
                            "flex items-center gap-1 text-xs",
                            member.role === "admin"
                              ? "text-[#6366F1]"
                              : "text-[#64748B]"
                          )}
                        >
                          {member.role === "admin" ? (
                            <Shield size={12} />
                          ) : (
                            <User size={12} />
                          )}
                          {member.role === "admin" ? "Admin" : "Membre"}
                        </span>
                      )}
                    </td>

                    {/* Current zone */}
                    <td className="px-4 py-3">
                      {zone ? (
                        <span className="flex items-center gap-1.5 text-xs text-[#F1F5F9]">
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"
                          />
                          {zone.name}
                        </span>
                      ) : (
                        <span className="text-xs text-[#64748B]">—</span>
                      )}
                    </td>

                    {/* Last seen */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-[#64748B]">
                        {pos?.updated_at
                          ? formatLastSeen(pos.updated_at)
                          : "—"}
                      </span>
                    </td>

                    {/* Actions */}
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {member.id !== currentProfile?.id && (
                          <button
                            onClick={() => void handleRemove(member.id)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-[#64748B] hover:text-red-400 transition-colors"
                            aria-label="Retirer le membre"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
