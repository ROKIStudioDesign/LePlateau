'use client'

import * as React from 'react'
import Sidebar from '@/components/layout/sidebar'

// ─── Mobile gate ──────────────────────────────────────────────────────────────

function MobileGate() {
  return (
    <div
      className="md:hidden fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div
        className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: 'var(--accent-light)' }}
      >
        <span className="text-xl font-bold" style={{ color: 'var(--accent-primary)', fontFamily: "'Syne', sans-serif" }}>
          LP
        </span>
      </div>
      <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
        MonPlateau
      </h1>
      <p className="text-base max-w-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        MonPlateau est optimisé pour desktop. Veuillez utiliser un écran plus large.
      </p>
    </div>
  )
}

// ─── Dashboard shell ──────────────────────────────────────────────────────────

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  // Mirror the sidebar's collapsed state so the main margin stays in sync.
  // The sidebar writes to localStorage; we read it on mount and listen for
  // a custom "sidebar-toggle" event dispatched by the sidebar on change.
  const [sidebarW, setSidebarW] = React.useState(220)

  React.useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setSidebarW(48)

    function onToggle(e: Event) {
      setSidebarW((e as CustomEvent<{ collapsed: boolean }>).detail.collapsed ? 48 : 220)
    }
    window.addEventListener('sidebar-toggle', onToggle)
    return () => window.removeEventListener('sidebar-toggle', onToggle)
  }, [])

  return (
    <>
      <MobileGate />

      <div
        className="hidden md:flex h-screen w-full overflow-hidden"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <Sidebar onToggle={(collapsed) => {
          setSidebarW(collapsed ? 48 : 220)
          window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed } }))
        }} />

        <main
          className="relative flex-1 overflow-y-auto"
          style={{ marginLeft: sidebarW, transition: 'margin-left 200ms ease' }}
        >
          {children}
        </main>
      </div>
    </>
  )
}
