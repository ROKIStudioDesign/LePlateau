"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OfficeMap, Zone, Profile } from "@/lib/types/database";
import { LayoutTemplate } from "lucide-react";

const OfficeEditorCanvas = dynamic(
  () => import("@/components/settings/office-editor-canvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
          <p className="text-xs text-[#64748B]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Chargement de l&apos;éditeur…
          </p>
        </div>
      </div>
    ),
  }
);

type LoadState = "loading" | "ready" | "no-org" | "no-map" | "forbidden";

export default function OfficeEditorPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [officeMap, setOfficeMap] = useState<OfficeMap | null>(null);
  const [zones, setZones]         = useState<Zone[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();

      if (!prof) return;
      setProfile(prof);

      if (prof.role !== "admin") {
        setLoadState("forbidden");
        return;
      }

      if (!prof.organization_id) {
        setLoadState("no-org");
        return;
      }

      const { data: mapData } = await supabase
        .from("office_maps")
        .select("*")
        .eq("organization_id", prof.organization_id)
        .order("created_at")
        .limit(1)
        .single();

      if (!mapData) {
        setLoadState("no-map");
        return;
      }
      setOfficeMap(mapData);

      const { data: zonesData } = await supabase
        .from("zones")
        .select("*")
        .eq("office_map_id", mapData.id)
        .order("created_at");

      setZones(zonesData ?? []);
      setLoadState("ready");
    }

    void load();
  }, []);

  if (loadState === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (loadState === "forbidden") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#1E1E2E] flex items-center justify-center">
          <LayoutTemplate size={22} className="text-[#334155]" />
        </div>
        <div>
          <p className="font-semibold text-[#F1F5F9]" style={{ fontFamily: "'Syne', sans-serif" }}>
            Accès réservé aux administrateurs
          </p>
          <p className="text-sm text-[#64748B] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Seuls les admins de l&apos;organisation peuvent modifier le plan du bureau.
          </p>
        </div>
      </div>
    );
  }

  if (loadState === "no-org") {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-[#64748B] text-sm">Aucune organisation trouvée.</p>
      </div>
    );
  }

  if (loadState === "no-map") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <LayoutTemplate size={36} className="text-[#1E1E2E]" />
        <div>
          <p className="font-semibold text-[#F1F5F9]" style={{ fontFamily: "'Syne', sans-serif" }}>
            Aucun plan de bureau
          </p>
          <p className="text-sm text-[#64748B] mt-1">
            Créez d&apos;abord un plan via l&apos;onboarding.
          </p>
        </div>
      </div>
    );
  }

  // ready
  return (
    <div className="h-full overflow-hidden">
      <OfficeEditorCanvas
        officeMap={officeMap!}
        initialZones={zones}
      />
    </div>
  );
}
