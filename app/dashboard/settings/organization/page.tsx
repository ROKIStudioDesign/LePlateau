"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Organization, Profile } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { Building2, Save, Camera, X } from "lucide-react";

const PLAN_LABELS = { free: "Gratuit", pro: "Pro", enterprise: "Enterprise" };

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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profileData) return;
      setProfile(profileData);

      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profileData.organization_id!)
        .single();

      if (orgData) {
        setOrg(orgData);
        setName(orgData.name);
      }

      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", profileData.organization_id!);

      setMemberCount(count ?? 0);
    }
    void load();
  }, []);

  async function handleSave() {
    if (!org) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({ name })
      .eq("id", org.id);

    setSaving(false);
    if (!error) {
      setOrg((prev) => (prev ? { ...prev, name } : prev));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function handleLogoUpload(file: File) {
    if (!org) return;
    setLogoUploading(true);
    setLogoError("");

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${org.id}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("org-logos")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setLogoError(uploadError.message);
      setLogoUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("org-logos")
      .getPublicUrl(path);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase
      .from("organizations")
      .update({ logo_url: publicUrl })
      .eq("id", org.id);

    setOrg((prev) => (prev ? { ...prev, logo_url: publicUrl } : prev));
    setLogoUploading(false);
  }

  async function handleRemoveLogo() {
    if (!org) return;
    const supabase = createClient();
    await supabase
      .from("organizations")
      .update({ logo_url: null })
      .eq("id", org.id);
    setOrg((prev) => (prev ? { ...prev, logo_url: null } : prev));
  }

  if (!org) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-[#13131A] animate-pulse" />
        ))}
      </div>
    );
  }

  const usagePercent = Math.round((memberCount / org.max_users) * 100);
  const isAdmin = profile?.role === "admin";

  return (
    <div className="p-8 max-w-2xl space-y-8 animate-fade-in">
      <div>
        <h1
          className="text-2xl font-bold text-[#F1F5F9]"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          Organisation
        </h1>
        <p className="text-[#64748B] text-sm mt-1">
          Gérez les paramètres de votre espace de travail.
        </p>
      </div>

      {/* General info */}
      <div
        className="rounded-lg p-6 space-y-6"
        style={{
          background: "#13131A",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div className="flex items-center gap-3">
          <Building2 size={18} className="text-[#6366F1]" />
          <h2 className="font-semibold text-[#F1F5F9]">
            Informations générales
          </h2>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <label className="text-sm text-[#64748B]">Logo</label>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden bg-[#1E1E2E] border border-[#1E1E2E]"
              >
                {org.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={org.logo_url}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-[#6366F1]">
                    {org.name[0]?.toUpperCase() ?? "O"}
                  </span>
                )}
              </div>
              {org.logo_url && isAdmin && (
                <button
                  onClick={() => void handleRemoveLogo()}
                  className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Retirer le logo"
                >
                  <X size={10} />
                </button>
              )}
            </div>

            {isAdmin && (
              <div className="flex flex-col gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleLogoUpload(file);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-[#1E1E2E] text-[#F1F5F9] hover:bg-[#1E1E2E] transition-colors disabled:opacity-50"
                >
                  <Camera size={14} />
                  {logoUploading ? "Envoi…" : "Changer le logo"}
                </button>
                {logoError && (
                  <p className="text-xs text-red-400">{logoError}</p>
                )}
                <p className="text-xs text-[#64748B]">
                  PNG, JPG, WebP · max 2 Mo
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm text-[#64748B]">
            Nom de l&apos;organisation
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin}
            className={cn(
              "w-full px-3 py-2 rounded-lg text-[#F1F5F9] text-sm",
              "bg-[#0A0A0F] border border-[#1E1E2E]",
              "focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent",
              "transition-all duration-150",
              !isAdmin && "opacity-60 cursor-not-allowed"
            )}
          />
        </div>

        {/* Slug (read-only) */}
        <div className="space-y-2">
          <label className="text-sm text-[#64748B]">Identifiant (slug)</label>
          <input
            value={org.slug}
            disabled
            className="w-full px-3 py-2 rounded-lg text-[#64748B] text-sm bg-[#0A0A0F] border border-[#1E1E2E] cursor-not-allowed font-mono"
          />
        </div>

        {isAdmin && (
          <button
            onClick={() => void handleSave()}
            disabled={saving || name === org.name || !name.trim()}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
              saving || name === org.name || !name.trim()
                ? "bg-[#1E1E2E] text-[#64748B] cursor-not-allowed"
                : "bg-[#6366F1] text-white hover:bg-[#5254cc] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
            )}
          >
            <Save size={14} />
            {saving ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer"}
          </button>
        )}
      </div>

      {/* Plan & usage */}
      <div
        className="rounded-lg p-6 space-y-4"
        style={{
          background: "#13131A",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        <h2 className="font-semibold text-[#F1F5F9]">Plan & utilisation</h2>

        <div className="flex items-center justify-between">
          <span className="text-sm text-[#64748B]">Plan actuel</span>
          <span
            className={cn(
              "px-2 py-1 rounded text-xs font-semibold",
              org.plan === "enterprise"
                ? "bg-[#6366F1]/20 text-[#6366F1]"
                : org.plan === "pro"
                  ? "bg-[#22D3EE]/20 text-[#22D3EE]"
                  : "bg-[#64748B]/20 text-[#64748B]"
            )}
          >
            {PLAN_LABELS[org.plan]}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#64748B]">Membres</span>
            <span className="text-[#F1F5F9] font-mono">
              {memberCount} / {org.max_users}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#1E1E2E] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(usagePercent, 100)}%`,
                background:
                  usagePercent >= 90
                    ? "#EF4444"
                    : usagePercent >= 70
                      ? "#F59E0B"
                      : "#6366F1",
              }}
            />
          </div>
        </div>

        {org.plan === "free" && (
          <div className="mt-2 p-4 rounded-lg border border-[#6366F1]/30 bg-[#6366F1]/5">
            <p className="text-sm text-[#F1F5F9] font-medium">
              Passez à Pro pour plus de membres
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              €5/membre/mois · Jusqu&apos;à 50 membres · Audio HD
            </p>
            <a
              href="/dashboard/settings/billing"
              className="inline-block mt-3 px-4 py-2 text-sm rounded-lg bg-[#6366F1] text-white font-medium hover:bg-[#5254cc] transition-colors"
            >
              Voir les plans →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
