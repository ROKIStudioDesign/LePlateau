"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Organization } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { Zap, Check, CreditCard } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Gratuit",
    price: "0€",
    period: "",
    description: "Parfait pour commencer",
    features: [
      "Jusqu'à 5 membres",
      "1 carte de bureau",
      "Audio basique",
      "Support communauté",
    ],
    cta: "Plan actuel",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "5€",
    period: "/membre/mois",
    description: "Pour les équipes qui grandissent",
    features: [
      "Jusqu'à 50 membres",
      "Cartes illimitées",
      "Audio HD spatial",
      "Intégration Teams avancée",
      "Support prioritaire",
    ],
    cta: "Passer à Pro",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Sur devis",
    period: "",
    description: "Pour les grandes organisations",
    features: [
      "Membres illimités",
      "SSO / SAML",
      "Audit logs",
      "SLA 99.9%",
      "Support dédié",
      "Déploiement on-premise",
    ],
    cta: "Nous contacter",
    highlight: false,
  },
] as const;

export default function BillingPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!profile?.organization_id) return;

      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single();
      setOrg(orgData);

      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id);
      setMemberCount(count ?? 0);
    }
    load();
  }, []);

  if (!org) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-lg bg-[#13131A] animate-pulse" />
        ))}
      </div>
    );
  }

  const usagePercent = Math.min((memberCount / org.max_users) * 100, 100);

  return (
    <div className="p-8 max-w-4xl space-y-8 animate-fade-in">
      <div>
        <h1
          className="text-2xl font-bold text-[#F1F5F9]"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          Facturation
        </h1>
        <p className="text-[#64748B] text-sm mt-1">
          Gérez votre plan et votre abonnement.
        </p>
      </div>

      {/* Current usage */}
      <div
        className="rounded-lg p-6 space-y-4"
        style={{
          background: "#13131A",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-[#6366F1]" />
          <h2 className="font-semibold text-[#F1F5F9]">Utilisation actuelle</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-[#64748B] uppercase tracking-wider">Plan</p>
            <p className="text-lg font-bold text-[#F1F5F9]" style={{ fontFamily: "Syne, sans-serif" }}>
              {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[#64748B] uppercase tracking-wider">Membres actifs</p>
            <p className="text-lg font-bold text-[#F1F5F9] font-mono">
              {memberCount} / {org.max_users}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[#64748B] uppercase tracking-wider">Prochaine facture</p>
            <p className="text-lg font-bold text-[#F1F5F9]">—</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[#64748B]">
            <span>Membres utilisés</span>
            <span>{Math.round(usagePercent)}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#1E1E2E] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${usagePercent}%`,
                background: usagePercent >= 90 ? "#EF4444" : usagePercent >= 70 ? "#F59E0B" : "#6366F1",
              }}
            />
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = org.plan === plan.id;
          return (
            <div
              key={plan.id}
              className={cn(
                "rounded-lg p-6 space-y-4 relative transition-all duration-200",
                plan.highlight
                  ? "ring-2 ring-[#6366F1]"
                  : "ring-1 ring-[#1E1E2E]"
              )}
              style={{
                background: plan.highlight ? "rgba(99,102,241,0.06)" : "#13131A",
                boxShadow: plan.highlight
                  ? "0 0 0 1px rgba(99,102,241,0.2), 0 8px 32px rgba(0,0,0,0.5)"
                  : "0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)",
              }}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-semibold bg-[#6366F1] text-white rounded-full flex items-center gap-1">
                    <Zap size={10} />
                    Recommandé
                  </span>
                </div>
              )}

              <div>
                <h3 className="font-bold text-[#F1F5F9]" style={{ fontFamily: "Syne, sans-serif" }}>
                  {plan.name}
                </h3>
                <p className="text-[#64748B] text-xs mt-0.5">{plan.description}</p>
              </div>

              <div>
                <span className="text-2xl font-bold text-[#F1F5F9]" style={{ fontFamily: "Syne, sans-serif" }}>
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-xs text-[#64748B]">{plan.period}</span>
                )}
              </div>

              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-[#64748B]">
                    <Check size={14} className="text-[#10B981] mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                disabled={isCurrent}
                className={cn(
                  "w-full py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  isCurrent
                    ? "bg-[#1E1E2E] text-[#64748B] cursor-not-allowed"
                    : plan.highlight
                      ? "bg-[#6366F1] text-white hover:bg-[#5254cc] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                      : "border border-[#1E1E2E] text-[#F1F5F9] hover:bg-[#1E1E2E]"
                )}
              >
                {isCurrent ? "Plan actuel" : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[#64748B] text-center">
        Intégration Stripe à venir · Paiement sécurisé · Annulation à tout moment
      </p>
    </div>
  );
}
