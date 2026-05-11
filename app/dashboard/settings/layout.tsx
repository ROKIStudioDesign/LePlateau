"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building2, Users, CreditCard, DoorOpen, LayoutTemplate, FileDown } from "lucide-react";

const NAV = [
  { href: "/dashboard/settings/organization", label: "Organisation", icon: Building2 },
  { href: "/dashboard/settings/members", label: "Membres", icon: Users },
  { href: "/dashboard/settings/rooms", label: "Salles", icon: DoorOpen },
  { href: "/dashboard/settings/office-editor", label: "Éditeur", icon: LayoutTemplate },
  { href: "/dashboard/settings/export", label: "Export RH", icon: FileDown },
  { href: "/dashboard/settings/billing", label: "Facturation", icon: CreditCard },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full">
      {/* Settings nav */}
      <nav
        className="w-52 border-r border-[#1E1E2E] p-4 space-y-1"
        style={{ background: "#0D0D14" }}
      >
        <p
          className="text-xs font-semibold text-[#64748B] uppercase tracking-wider px-3 py-2"
          style={{ fontFamily: "Syne, sans-serif" }}
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
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                active
                  ? "bg-[#6366F1]/15 text-[#6366F1] font-medium"
                  : "text-[#64748B] hover:text-[#F1F5F9] hover:bg-[#1E1E2E]"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
