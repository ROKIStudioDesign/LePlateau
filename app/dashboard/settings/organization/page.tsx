"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Organization, Profile } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { Building2, Save, Camera, X } from "lucide-react";

const PLAN_LABELS = { free: "Gratuit", pro: "Pro", enterprise: "Enterprise" };

const inputCls = "w-full px-3 py-2 rounded-lg text-sm transition-all duration-150 outline-none";
const inputStyle = {
  background: "var(--bg-primary)",
  border: "1px solid var(--border-primary)",
  color: "var(--text-primary)",
};

export default function OrganizationSettingsPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profileData) return;
      setProfile(profileData);
      const { data: orgData } = await supabase.from("organizations").select("*").eq("id", profileData.organization_id!).single();
      if (orgData) { setOrg(orgData); setName(orgData.name); }
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("organization_id", profileData.organization_id!);
      setMemberCount(count ?? 0);
    }
    void load();
  }, []);

  async function handleSave() {
    if (!org) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("organizations").update({ name }).eq("id", org.id);
    setSaving(false);
    if (!error) { setOrg((prev) => prev ? { ...prev, name } : prev); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  }

  async function handleLogoUpload(file: File) {
    if (!org) return;
    setLogoUploading(true); setLogoError("");
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${org.id}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage.from("org-logos").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) { setLogoError(uploadError.message); setLogoUploading(false); return; }
    const { data: urlData } = supabase.storage.from("org-logos").getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("organizations").update({ logo_url: publicUrl }).eq("id", org.id);
    setOrg((prev) => prev ? { ...prev, logo_url: publicUrl } : prev);
    setLogoUploading(false);
  }

  async function handleRemoveLogo() {
    if (!org) return;
    const supabase = createClient();
    await supabase.from("organizations").update({ logo_url: null }).eq("id", org.id);
    setOrg((prev) => prev ? { ...prev, logo_url: null } : prev);
  }

  if (!org) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "var(--bg-tertiary)" }} />
        ))}
      </div>
    );
  }

  const usagePercent = Math.round((memberCount / org.max_users) * 100);
  const isAdmin = profile?.role === "admin";

  const cardStyle = {
    background: "var(--bg-primary)",
    border: "1px solid var(--border-primary)",
    borderRadius: 8,
    boxShadow: "var(--shadow-sm)",
  };

  return (
    <div className="p-8 max-w-2xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "Syne, sans-serif" }}>
          Organisation
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Gérez les paramètres de votre espace de travail.
        </p>
      </div>

      {/* General info */}
      <div className="rounded-lg p-6 space-y-6" style={cardStyle}>
        <div className="flex items-center gap-3">
          <Building2 size={18} style={{ color: "var(--accent-primary)" }} />
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Informations générales</h2>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <label className="text-sm" style={{ color: "var(--text-secondary)" }}>Logo</label>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden"
                style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)" }}
              >
                {org.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={org.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold" style={{ color: "var(--accent-primary)" }}>
                    {org.name[0]?.toUpperCase() ?? "O"}
                  </span>
                )}
              </div>
              {org.logo_url && isAdmin && (
                <button
                  onClick={() => void handleRemoveLogo()}
                  className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              )}
            </div>
            {isAdmin && (
              <div className="flex flex-col gap-1.5">
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleLogoUpload(file); e.target.value = ""; }} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                  style={{ border: "1px solid var(--border-primary)", color: "var(--text-primary)", background: "var(--bg-primary)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-primary)"; }}
                >
                  <Camera size={14} />
                  {logoUploading ? "Envoi…" : "Changer le logo"}
                </button>
                {logoError && <p className="text-xs text-red-500">{logoError}</p>}
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>PNG, JPG, WebP · max 2 Mo</p>
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm" style={{ color: "var(--text-secondary)" }}>Nom de l&apos;organisation</label>
          <input
            value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin}
            className={cn(inputCls, !isAdmin && "opacity-60 cursor-not-allowed")}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.border = "1px solid var(--accent-primary)"; }}
            onBlur={(e) => { e.currentTarget.style.border = "1px solid var(--border-primary)"; }}
          />
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <label className="text-sm" style={{ color: "var(--text-secondary)" }}>Identifiant (slug)</label>
          <input value={org.slug} disabled className={cn(inputCls, "cursor-not-allowed font-mono opacity-60")} style={inputStyle} />
        </div>

        {isAdmin && (
          <button
            onClick={() => void handleSave()}
            disabled={saving || name === org.name || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--accent-primary)", color: "white" }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "var(--accent-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent-primary)"; }}
          >
            <Save size={14} />
            {saving ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer"}
          </button>
        )}
      </div>

      {/* Plan & usage */}
      <div className="rounded-lg p-6 space-y-4" style={cardStyle}>
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Plan & utilisation</h2>

        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Plan actuel</span>
          <span
            className="px-2 py-1 rounded text-xs font-semibold"
            style={{
              background: org.plan === "enterprise" ? "var(--accent-light)" : org.plan === "pro" ? "#E0F2FE" : "var(--bg-tertiary)",
              color: org.plan === "enterprise" ? "var(--accent-primary)" : org.plan === "pro" ? "#0369A1" : "var(--text-secondary)",
            }}
          >
            {PLAN_LABELS[org.plan]}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Membres</span>
            <span className="font-mono" style={{ color: "var(--text-primary)" }}>{memberCount} / {org.max_users}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(usagePercent, 100)}%`,
                background: usagePercent >= 90 ? "var(--danger)" : usagePercent >= 70 ? "var(--warning)" : "var(--accent-primary)",
              }}
            />
          </div>
        </div>

        {org.plan === "free" && (
          <div className="mt-2 p-4 rounded-lg" style={{ border: "1px solid var(--accent-light)", background: "var(--accent-light)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>Passez à Pro pour plus de membres</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>€5/membre/mois · Jusqu&apos;à 50 membres · Audio HD</p>
            <a
              href="/dashboard/settings/billing"
              className="inline-block mt-3 px-4 py-2 text-sm rounded-lg font-medium transition-colors"
              style={{ background: "var(--accent-primary)", color: "white" }}
            >
              Voir les plans →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
