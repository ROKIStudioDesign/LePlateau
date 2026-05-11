"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building2, Users, CreditCard, DoorOpen, LayoutTemplate, FileDown } from "lucide-react";

const NAV = [
  { href: "/dashboard/settings/organization", label: "Organisation", icon: Building2 },
  { href: "/dashboard/settings/members",      label: "Membres",       icon: Users },
  { href: "/dashboard/settings/rooms",        label: "Salles",        icon: DoorOpen },
  { href: "/dashboard/settings/office-editor",label: "Éditeur",       icon: LayoutTemplate },
  { href: "/dashboard/settings/export",       label: "Export RH",     icon: FileDown },
  { href: "/dashboard/settings/billing",      label: "Facturation",   icon: CreditCard },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full">
      {/* Settings sub-nav */}
      <nav
        className="w-52 shrink-0 p-4 space-y-0.5"
        style={{
          background: "var(--bg-primary)",
          borderRight: "1px solid var(--border-primary)",
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider px-3 py-2"
          style={{ color: "var(--text-muted)", fontFamily: "'Syne', sans-serif" }}
        >
          Paramètres
        </p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-100",
                active ? "font-medium" : ""
              )}
              style={{
                background: active ? "var(--accent-light)" : "transparent",
                color: active ? "var(--accent-primary)" : "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "var(--bg-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <Icon size={15} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg-secondary)" }}>
        {children}
      </div>
    </div>
  );
}
