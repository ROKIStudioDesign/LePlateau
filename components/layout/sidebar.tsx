'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  Map,
  Users,
  Settings,
  CalendarDays,
  DoorOpen,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types/database'

// ─── Nav items ────────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Bureau',    href: '/dashboard/office',               icon: Map },
  { label: 'Planning',  href: '/dashboard/schedule',             icon: CalendarDays },
  { label: 'Salles',    href: '/dashboard/rooms',                icon: DoorOpen },
  { label: 'Membres',   href: '/dashboard/settings/members',     icon: Users },
  { label: 'Paramètres',href: '/dashboard/settings/organization',icon: Settings },
]

// ─── Collapsed tooltip ────────────────────────────────────────────────────────

function NavTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="right"
            sideOffset={8}
            className="z-50 px-2.5 py-1.5 rounded-md text-xs font-medium select-none animate-fade-in"
            style={{
              background: 'var(--text-primary)',
              color: 'var(--bg-primary)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {label}
            <Tooltip.Arrow style={{ fill: 'var(--text-primary)' }} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

// ─── User initials helper ─────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar({ onToggle }: { onToggle?: (collapsed: boolean) => void } = {}) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = React.useMemo(() => createClient(), [])

  const [collapsed, setCollapsed] = React.useState(false)
  const [profile,   setProfile]   = React.useState<Profile | null>(null)
  const [orgName,   setOrgName]   = React.useState<string | null>(null)

  // Persist collapsed state across reloads
  React.useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v
      localStorage.setItem('sidebar-collapsed', String(next))
      onToggle?.(next)
      return next
    })
  }

  // Load profile + org name
  React.useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!prof || cancelled) return
      setProfile(prof)

      if (prof.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', prof.organization_id)
          .single()
        if (org && !cancelled) setOrgName(org.name)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [supabase])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const W = collapsed ? 48 : 220

  return (
    <aside
      style={{
        width: W,
        minWidth: W,
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-primary)',
        transition: 'width 200ms ease',
      }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col overflow-hidden"
    >
      {/* ── Top: logo + app name + org ────────────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 px-3 shrink-0"
        style={{ height: 52, borderBottom: '1px solid var(--border-primary)' }}
      >
        {/* LP icon */}
        <div
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{
            width: 28,
            height: 28,
            background: 'var(--accent-light)',
            color: 'var(--accent-primary)',
          }}
        >
          <span className="text-[11px] font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
            LP
          </span>
        </div>

        {/* App name + org */}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-bold truncate leading-tight"
              style={{ color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}
            >
              MonPlateau
            </p>
            {orgName && (
              <p
                className="text-[11px] truncate leading-tight"
                style={{ color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}
              >
                {orgName}
              </p>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapsed}
          className="shrink-0 flex items-center justify-center rounded-md transition-colors duration-100"
          style={{
            width: 20,
            height: 20,
            color: 'var(--text-muted)',
            marginLeft: collapsed ? 'auto' : 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
          aria-label={collapsed ? 'Développer' : 'Réduire'}
        >
          {collapsed
            ? <ChevronRight size={14} strokeWidth={2} />
            : <ChevronLeft  size={14} strokeWidth={2} />
          }
        </button>
      </div>

      {/* ── Primary nav ───────────────────────────────────────────────────── */}
      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)

          const item = (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-lg transition-colors duration-100 outline-none focus-visible:ring-2"
              style={{
                height: 32,
                padding: collapsed ? '0 8px' : '0 8px',
                justifyContent: collapsed ? 'center' : undefined,
                background: active ? 'var(--accent-light)' : 'transparent',
                color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent'
              }}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.75} className="shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{label}</span>
              )}
            </Link>
          )

          return collapsed ? (
            <NavTooltip key={href} label={label}>
              {item}
            </NavTooltip>
          ) : item
        })}
      </nav>

      {/* ── Bottom: user ──────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-2 py-3 flex flex-col gap-1"
        style={{ borderTop: '1px solid var(--border-primary)' }}
      >
        {/* User row */}
        <div
          className="flex items-center gap-2.5 rounded-lg transition-colors duration-100 cursor-default"
          style={{
            height: 36,
            padding: collapsed ? '0 8px' : '0 8px',
            justifyContent: collapsed ? 'center' : undefined,
          }}
        >
          {/* Avatar */}
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="rounded-full shrink-0 object-cover"
              style={{ width: 28, height: 28 }}
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-full shrink-0 text-xs font-bold"
              style={{
                width: 28,
                height: 28,
                background: 'var(--accent-light)',
                color: 'var(--accent-primary)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {profile ? getInitials(profile.display_name) : '…'}
            </div>
          )}

          {/* Name */}
          {!collapsed && (
            <span
              className="flex-1 text-sm font-medium truncate"
              style={{ color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif" }}
            >
              {profile?.display_name ?? '…'}
            </span>
          )}

          {/* Settings gear */}
          {!collapsed && (
            <Link
              href="/dashboard/settings/organization"
              className="flex items-center justify-center rounded-md transition-colors duration-100 shrink-0"
              style={{ width: 24, height: 24, color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
              aria-label="Paramètres"
            >
              <Settings size={15} strokeWidth={1.75} />
            </Link>
          )}
        </div>

        {/* Sign out */}
        {!collapsed ? (
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 rounded-lg transition-colors duration-100 text-sm"
            style={{
              height: 32,
              padding: '0 8px',
              color: 'var(--text-muted)',
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <LogOut size={15} strokeWidth={1.75} className="shrink-0" />
            <span>Se déconnecter</span>
          </button>
        ) : (
          <NavTooltip label="Se déconnecter">
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center rounded-lg transition-colors duration-100"
              style={{
                height: 32,
                width: '100%',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              <LogOut size={15} strokeWidth={1.75} />
            </button>
          </NavTooltip>
        )}
      </div>
    </aside>
  )
}
