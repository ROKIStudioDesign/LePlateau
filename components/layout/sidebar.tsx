'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Map, Users, Settings, Bell, LogOut, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { useOfficeStore } from '@/lib/store/office'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types/database'

// ─── Nav items ────────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Bureau', href: '/dashboard/office', icon: Map },
  { label: 'Planning', href: '/dashboard/schedule', icon: CalendarDays },
  { label: 'Membres', href: '/dashboard/settings/members', icon: Users },
  { label: 'Paramètres', href: '/dashboard/settings/organization', icon: Settings },
]

// ─── Tooltip wrapper ──────────────────────────────────────────────────────────

function SidebarTooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="right"
            sideOffset={8}
            className={cn(
              'z-50 px-3 py-1.5 rounded-md text-xs font-sans font-medium',
              'bg-[#1E1E2E] text-[#F1F5F9] border border-[#1E1E2E]',
              'shadow-card animate-fade-in select-none'
            )}
          >
            {label}
            <Tooltip.Arrow className="fill-[#1E1E2E]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

// ─── Icon button ──────────────────────────────────────────────────────────────

function IconButton({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#13131A]',
        active
          ? 'bg-[#6366F1] text-[#F1F5F9] shadow-glow'
          : 'bg-transparent text-[#64748B] hover:bg-white/5 hover:text-[#F1F5F9]',
        className
      )}
    >
      {children}
    </button>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [popoverOpen, setPopoverOpen] = React.useState(false)

  const knockNotifications = useOfficeStore((s) => s.knockNotifications)
  const unreadCount = knockNotifications.length

  // Fetch current user profile on mount
  React.useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || cancelled) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data && !cancelled) {
        setProfile(data)
      }
    }

    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [supabase])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  // Close popover on outside click
  const popoverRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!popoverOpen) return

    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [popoverOpen])

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen w-[60px] flex-col items-center',
        'bg-[#13131A] border-r border-[#1E1E2E]',
        'py-4'
      )}
    >
      {/* Logo mark */}
      <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-lg bg-[#6366F1]/20">
        <span className="font-display text-xs font-bold text-[#6366F1]">LP</span>
      </div>

      {/* Primary nav */}
      <nav className="flex flex-1 flex-col items-center gap-2">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <SidebarTooltip key={href} label={label}>
              <Link href={href} tabIndex={-1}>
                <IconButton active={active}>
                  <Icon size={18} strokeWidth={1.8} />
                </IconButton>
              </Link>
            </SidebarTooltip>
          )
        })}
      </nav>

      {/* Bottom items */}
      <div className="flex flex-col items-center gap-2 mt-auto">
        {/* Notifications bell */}
        <SidebarTooltip label="Notifications">
          <IconButton active={false} className="relative">
            <Bell size={18} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span
                className={cn(
                  'absolute -top-0.5 -right-0.5 flex items-center justify-center',
                  'min-w-[16px] h-4 px-0.5 rounded-full',
                  'bg-[#6366F1] text-[#F1F5F9] text-[10px] font-sans font-bold leading-none'
                )}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </IconButton>
        </SidebarTooltip>

        {/* User avatar + popover */}
        <div ref={popoverRef} className="relative">
          <SidebarTooltip label={profile?.display_name ?? 'Mon compte'}>
            <button
              onClick={() => setPopoverOpen((v) => !v)}
              className={cn(
                'flex items-center justify-center rounded-full',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#13131A]',
                'transition-opacity hover:opacity-80'
              )}
              aria-label="Mon compte"
            >
              <Avatar
                src={profile?.avatar_url}
                name={profile?.display_name}
                size="sm"
              />
            </button>
          </SidebarTooltip>

          {popoverOpen && (
            <div
              className={cn(
                'absolute left-full bottom-0 ml-3 z-50 w-52',
                'bg-[#13131A] border border-[#1E1E2E] rounded-lg shadow-card',
                'p-3 animate-fade-in'
              )}
            >
              <p className="font-display font-semibold text-sm text-[#F1F5F9] truncate mb-0.5">
                {profile?.display_name ?? '—'}
              </p>
              <p className="text-xs text-[#64748B] mb-3">Mon compte</p>
              <button
                onClick={handleSignOut}
                className={cn(
                  'flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-sm font-sans',
                  'text-[#64748B] hover:text-[#F1F5F9] hover:bg-white/5 transition-colors'
                )}
              >
                <LogOut size={14} strokeWidth={1.8} />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
