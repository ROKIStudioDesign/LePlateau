"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Organization } from "@/lib/types/database";
import { Zap, Check, CreditCard } from "lucide-react";

const PLANS = [
  { id: "free", name: "Gratuit", price: "0€", period: "", description: "Parfait pour commencer",
    features: ["Jusqu'à 5 membres", "1 carte de bureau", "Audio basique", "Support communauté"],
    cta: "Plan actuel", highlight: false },
  { id: "pro", name: "Pro", price: "5€", period: "/membre/mois", description: "Pour les équipes qui grandissent",
    features: ["Jusqu'à 50 membres", "Cartes illimitées", "Audio HD spatial", "Intégration Teams avancée", "Support prioritaire"],
    cta: "Passer à Pro", highlight: true },
  { id: "enterprise", name: "Enterprise", price: "Sur devis", period: "", description: "Pour les grandes organisations",
    features: ["Membres illimités", "SSO / SAML", "Audit logs", "SLA 99.9%", "Support dédié", "Déploiement on-premise"],
    cta: "Nous contacter", highlight: false },
] as const;

export default function BillingPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profile?.organization_id) return;
      const { data: orgData } = await supabase.from("organizations").select("*").eq("id", profile.organization_id).single();
      setOrg(orgData);
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("organization_id", profile.organization_id);
      setMemberCount(count ?? 0);
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!org) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-lg animate-pulse" style={{ background: "var(--bg-tertiary)" }} />
        ))}
      </div>
    );
  }

  const usagePercent = Math.min((memberCount / org.max_users) * 100, 100);
  const cardStyle = { background: "var(--bg-primary)", border: "1px solid var(--border-primary)", borderRadius: 8, boxShadow: "var(--shadow-sm)" };

  return (
    <div className="p-8 max-w-4xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "Syne, sans-serif" }}>Facturation</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Gérez votre plan et votre abonnement.</p>
      </div>

      {/* Usage */}
      <div className="rounded-lg p-6 space-y-4" style={cardStyle}>
        <div className="flex items-center gap-2">
          <CreditCard size={16} style={{ color: "var(--accent-primary)" }} />
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Utilisation actuelle</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Plan", value: org.plan.charAt(0).toUpperCase() + org.plan.slice(1) },
            { label: "Membres actifs", value: `${memberCount} / ${org.max_users}` },
            { label: "Prochaine facture", value: "—" },
          ].map(({ label, value }) => (
            <div key={label} className="space-y-1">
              <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
              <p className="text-lg font-bold font-mono" style={{ color: "var(--text-primary)", fontFamily: "Syne, sans-serif" }}>{value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
            <span>Membres utilisés</span>
            <span>{Math.round(usagePercent)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${usagePercent}%`, background: usagePercent >= 90 ? "var(--danger)" : usagePercent >= 70 ? "var(--warning)" : "var(--accent-primary)" }}
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
              className="rounded-lg p-6 space-y-4 relative"
              style={{
                background: plan.highlight ? "var(--accent-light)" : "var(--bg-primary)",
                border: `1px solid ${plan.highlight ? "var(--accent-primary)" : "var(--border-primary)"}`,
                boxShadow: plan.highlight ? "var(--shadow-md)" : "var(--shadow-sm)",
              }}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-semibold text-white rounded-full flex items-center gap-1"
                    style={{ background: "var(--accent-primary)" }}>
                    <Zap size={10} /> Recommandé
                  </span>
                </div>
              )}
              <div>
                <h3 className="font-bold" style={{ color: "var(--text-primary)", fontFamily: "Syne, sans-serif" }}>{plan.name}</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{plan.description}</p>
              </div>
              <div>
                <span className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "Syne, sans-serif" }}>{plan.price}</span>
                {plan.period && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{plan.period}</span>}
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <Check size={14} className="mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent}
                className="w-full py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed"
                style={isCurrent
                  ? { background: "var(--bg-tertiary)", color: "var(--text-muted)" }
                  : plan.highlight
                    ? { background: "var(--accent-primary)", color: "white" }
                    : { border: "1px solid var(--border-primary)", color: "var(--text-primary)", background: "var(--bg-primary)" }
                }
                onMouseEnter={(e) => {
                  if (!isCurrent && plan.highlight) e.currentTarget.style.background = "var(--accent-hover)";
                  else if (!isCurrent) e.currentTarget.style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent && plan.highlight) e.currentTarget.style.background = "var(--accent-primary)";
                  else if (!isCurrent) e.currentTarget.style.background = "var(--bg-primary)";
                }}
              >
                {isCurrent ? "Plan actuel" : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
        Intégration Stripe à venir · Paiement sécurisé · Annulation à tout moment
      </p>
    </div>
  );
}
