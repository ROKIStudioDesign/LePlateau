'use client'

import * as React from 'react'
import Sidebar from '@/components/layout/sidebar'
import { cn } from '@/lib/utils'

// ─── Mobile gate ──────────────────────────────────────────────────────────────

function MobileGate() {
  return (
    <div
      className={cn(
        'md:hidden fixed inset-0 z-50 flex flex-col items-center justify-center',
        'bg-[#0A0A0F] px-6 text-center'
      )}
    >
      {/* Logo */}
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6366F1]/20">
        <span className="font-display text-xl font-bold text-[#6366F1]">LP</span>
      </div>

      <h1 className="font-display text-2xl font-bold text-[#F1F5F9] mb-3">
        LePlateau
      </h1>

      <p className="font-sans text-base text-[#64748B] max-w-xs leading-relaxed">
        LePlateau est optimisé pour desktop. Veuillez utiliser un écran plus
        large.
      </p>
    </div>
  )
}

// ─── Dashboard shell ──────────────────────────────────────────────────────────

interface DashboardShellProps {
  children: React.ReactNode
}

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <>
      {/* Mobile blocking overlay */}
      <MobileGate />

      {/* Desktop layout */}
      <div className="hidden md:flex h-screen w-full overflow-hidden bg-[#0A0A0F]">
        {/* Fixed 60px sidebar */}
        <Sidebar />

        {/* Main content — offset by sidebar width */}
        <main
          className={cn(
            'relative flex-1 overflow-y-auto',
            'ml-[60px]' // matches sidebar width
          )}
        >
          {children}
        </main>
      </div>
    </>
  )
}
