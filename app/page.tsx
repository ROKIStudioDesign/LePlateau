'use client'

import React, {
  useRef,
  useState,
  useEffect,
  memo,
  useId,
} from 'react'
import Link from 'next/link'
import { motion, useInView, AnimatePresence } from 'framer-motion'

// ─────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────

function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.15 })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: 'var(--accent-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="10" height="10" rx="2.5" fill="white" fillOpacity="0.9" />
        <rect x="15" y="3" width="10" height="10" rx="2.5" fill="white" fillOpacity="0.6" />
        <rect x="3" y="15" width="10" height="10" rx="2.5" fill="white" fillOpacity="0.6" />
        <rect x="15" y="15" width="10" height="10" rx="2.5" fill="white" fillOpacity="0.9" />
      </svg>
    </div>
  )
}

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{
        background: 'var(--accent-light)',
        border: '1px solid var(--accent-primary)',
        color: 'var(--accent-primary)',
        letterSpacing: '0.04em',
        borderColor: 'rgba(91,91,214,0.3)',
      }}
    >
      {children}
    </span>
  )
}

function CheckBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5">
        <circle cx="9" cy="9" r="9" fill="var(--accent-light)" />
        <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="var(--accent-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{children}</span>
    </li>
  )
}

// ─────────────────────────────────────────────────────────────
// ANIMATED VISUALS
// ─────────────────────────────────────────────────────────────

function SvgAvatar({
  paths,
  color,
  statusColor = '#22C55E',
  speaking = false,
  delay = 0,
  animId,
}: {
  paths: [number, number][]
  color: string
  statusColor?: string
  speaking?: boolean
  delay?: number
  animId: string
}) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (paths.length < 2) return
    const id = setInterval(
      () => setIdx((i) => (i + 1) % paths.length),
      2800 + delay * 380
    )
    return () => clearInterval(id)
  }, [paths.length, delay])

  const [x, y] = paths[idx]

  return (
    <>
      <style>{`
        @keyframes ${animId}ring {
          0%   { opacity: 0.55; transform: scale(1); }
          100% { opacity: 0;    transform: scale(2.3); }
        }
      `}</style>
      <motion.g
        animate={{ x, y }}
        initial={{ x: paths[0][0], y: paths[0][1] }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {speaking &&
          [0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={0}
              cy={0}
              r={12}
              fill="none"
              stroke="#22D3EE"
              strokeWidth={1.5}
              style={{
                animation: `${animId}ring 1.9s ease-out ${i * 0.63}s infinite`,
                transformBox: 'fill-box' as React.CSSProperties['transformBox'],
                transformOrigin: 'center',
              }}
            />
          ))}
        <circle cx={0} cy={0} r={9} fill={color} />
        <circle cx={0} cy={0} r={11.5} fill="none" stroke={statusColor} strokeWidth={1.5} />
        <circle cx={-3} cy={-3} r={2.8} fill="rgba(255,255,255,0.3)" />
      </motion.g>
    </>
  )
}

const vizCardStyle = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-primary)',
  boxShadow: 'var(--shadow-md)',
}

const vizBarStyle = {
  borderBottom: '1px solid var(--border-primary)',
  background: 'var(--bg-secondary)',
}

const OfficeMapAnimation = memo(function OfficeMapAnimation() {
  const uid = useId().replace(/:/g, 'x')
  const gridId = `g${uid}`

  const zones = [
    { x: 24,  y: 24,  w: 220, h: 150, fill: 'rgba(91,91,214,0.07)',   stroke: 'rgba(91,91,214,0.3)',   accent: '#5B5BD6', label: 'Open Space'  },
    { x: 260, y: 24,  w: 148, h: 70,  fill: 'rgba(34,211,238,0.07)',  stroke: 'rgba(34,211,238,0.3)',  accent: '#22D3EE', label: 'Salle Alpha'  },
    { x: 260, y: 104, w: 148, h: 70,  fill: 'rgba(34,211,238,0.07)',  stroke: 'rgba(34,211,238,0.3)',  accent: '#22D3EE', label: 'Salle Bêta'   },
    { x: 24,  y: 190, w: 128, h: 100, fill: 'rgba(16,185,129,0.07)',  stroke: 'rgba(16,185,129,0.3)',  accent: '#10B981', label: 'Focus'        },
    { x: 168, y: 190, w: 110, h: 100, fill: 'rgba(245,158,11,0.07)',  stroke: 'rgba(245,158,11,0.3)',  accent: '#F59E0B', label: 'Café'         },
    { x: 294, y: 190, w: 114, h: 100, fill: 'rgba(139,92,246,0.07)',  stroke: 'rgba(139,92,246,0.3)',  accent: '#8B5CF6', label: 'Social'       },
  ]

  const avatars: {
    paths: [number, number][]
    color: string
    statusColor: string
    speaking: boolean
    delay: number
  }[] = [
    { paths: [[80, 80], [150, 68], [118, 126]],  color: '#5B5BD6', statusColor: '#22C55E', speaking: false, delay: 0 },
    { paths: [[162, 102], [84, 134], [142, 142]], color: '#22D3EE', statusColor: '#22C55E', speaking: true,  delay: 1 },
    { paths: [[204, 76], [184, 122]],             color: '#10B981', statusColor: '#EF4444', speaking: false, delay: 2 },
    { paths: [[334, 59]],                         color: '#F59E0B', statusColor: '#22C55E', speaking: true,  delay: 0 },
    { paths: [[334, 139]],                        color: '#818CF8', statusColor: '#EF4444', speaking: false, delay: 0 },
    { paths: [[88, 240]],                         color: '#5B5BD6', statusColor: '#EAB308', speaking: false, delay: 0 },
    { paths: [[351, 240], [318, 262]],            color: '#22D3EE', statusColor: '#22C55E', speaking: false, delay: 1 },
    { paths: [[223, 240]],                        color: '#F59E0B', statusColor: '#22C55E', speaking: false, delay: 0 },
  ]

  return (
    <div className="w-full rounded-2xl overflow-hidden" style={vizCardStyle}>
      <div className="flex items-center gap-2 px-4 py-3" style={vizBarStyle}>
        <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#FFBD2E' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#28CA41' }} />
        <span className="ml-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          MonPlateau — Bureau virtuel
        </span>
      </div>

      <svg viewBox="0 0 432 308" className="w-full" style={{ display: 'block' }}>
        <defs>
          <pattern id={gridId} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.75" fill="rgba(0,0,0,0.07)" />
          </pattern>
        </defs>
        <rect width="432" height="308" fill={`url(#${gridId})`} />

        {zones.map((z, i) => (
          <g key={i}>
            <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={10} fill={z.fill} stroke={z.stroke} strokeWidth={1} />
            <rect x={z.x + 10} y={z.y} width={z.w - 20} height={2.5} rx={1.5} fill={z.accent} opacity={0.7} />
            <text
              x={z.x + z.w / 2}
              y={z.y + z.h - 9}
              textAnchor="middle"
              fontSize="9.5"
              fill="rgba(0,0,0,0.35)"
              fontFamily="'DM Sans', sans-serif"
            >
              {z.label}
            </text>
          </g>
        ))}

        {avatars.map((a, i) => (
          <SvgAvatar key={i} {...a} animId={`${uid}a${i}`} />
        ))}
      </svg>
    </div>
  )
})

const AudioSpatialViz = memo(function AudioSpatialViz() {
  const uid = useId().replace(/:/g, 'x')
  const gridId = `ag${uid}`
  const gradId = `nd${uid}`

  return (
    <div className="w-full rounded-2xl overflow-hidden" style={vizCardStyle}>
      <div className="flex items-center gap-2 px-4 py-3" style={vizBarStyle}>
        <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#FFBD2E' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#28CA41' }} />
        <span className="ml-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Audio spatial</span>
      </div>

      <svg viewBox="0 0 340 180" className="w-full" style={{ display: 'block' }}>
        <defs>
          <pattern id={gridId} x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="rgba(0,0,0,0.06)" />
          </pattern>
          <radialGradient id={gradId} cx="60%" cy="50%" r="40%">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
          </radialGradient>
          <style>{`
            @keyframes ${uid}ring2 {
              0%   { opacity: 0.5; transform: scale(1); }
              100% { opacity: 0;   transform: scale(2.4); }
            }
          `}</style>
        </defs>

        <rect width="340" height="180" fill={`url(#${gridId})`} />
        <ellipse cx="220" cy="90" rx="80" ry="80" fill={`url(#${gradId})`} />

        <line x1="100" y1="90" x2="218" y2="90" stroke="rgba(34,211,238,0.4)" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x="159" y="82" textAnchor="middle" fontSize="9" fill="rgba(34,211,238,0.7)" fontFamily="'DM Sans', sans-serif">
          proche →
        </text>

        {/* Listener avatar */}
        <g transform="translate(100,90)">
          <circle r={11} fill="#5B5BD6" />
          <circle r={13.5} fill="none" stroke="#22C55E" strokeWidth="1.5" />
          <text y="1" textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="white" fontFamily="'DM Sans', sans-serif" fontWeight="600">T</text>
        </g>

        {/* Volume bars */}
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.rect
            key={i}
            x={59 + i * 7}
            y={84}
            width={5}
            height={12}
            rx={2.5}
            fill="#5B5BD6"
            style={{ transformBox: 'fill-box' as React.CSSProperties['transformBox'], transformOrigin: 'bottom center' }}
            animate={{ scaleY: [0.25, 0.7 + i * 0.12, 0.25] }}
            transition={{ duration: 0.75, delay: i * 0.13, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* Speaker avatar */}
        <g transform="translate(220,90)">
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={0}
              cy={0}
              r={13}
              fill="none"
              stroke="#22D3EE"
              strokeWidth={1.5}
              style={{
                animation: `${uid}ring2 1.9s ease-out ${i * 0.63}s infinite`,
                transformBox: 'fill-box' as React.CSSProperties['transformBox'],
                transformOrigin: 'center',
              }}
            />
          ))}
          <circle r={11} fill="#22D3EE" />
          <circle r={13.5} fill="none" stroke="#22C55E" strokeWidth="1.5" />
          <text y="1" textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="white" fontFamily="'DM Sans', sans-serif" fontWeight="600">M</text>
        </g>
      </svg>

      <div
        className="flex items-center justify-center gap-6 px-6 py-3 text-xs"
        style={{ borderTop: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
      >
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#5B5BD6' }} /> Vous
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#22D3EE' }} /> Marie (parle)
        </span>
        <span style={{ color: '#22D3EE' }}>Volume adapté ✓</span>
      </div>
    </div>
  )
})

const TeamsIntegrationViz = memo(function TeamsIntegrationViz() {
  const statuses = ['Available', 'In a call', 'Do not disturb', 'Away', 'Available'] as const
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % statuses.length), 2200)
    return () => clearInterval(id)
  }, [statuses.length])

  const colorMap: Record<string, string> = {
    Available: '#22C55E',
    'In a call': '#EF4444',
    'Do not disturb': '#EF4444',
    Away: '#EAB308',
  }

  const current = statuses[idx]
  const color = colorMap[current] ?? '#6B7280'

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{ ...vizCardStyle, minHeight: 240, display: 'flex', flexDirection: 'column' }}
    >
      <div className="flex items-center gap-2 px-4 py-3" style={vizBarStyle}>
        <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#FFBD2E' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#28CA41' }} />
        <span className="ml-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Intégration Microsoft Teams</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        <div className="flex items-center gap-5 w-full max-w-xs">
          {/* Teams */}
          <div
            className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(80,89,201,0.08)', border: '1px solid rgba(80,89,201,0.2)' }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-base font-bold text-white"
              style={{ background: '#5059C9' }}
            >T</div>
            <div className="min-w-0">
              <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Teams</div>
              <AnimatePresence mode="wait">
                <motion.div key={current} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.22 }} className="text-[10px]" style={{ color }}>
                  {current}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Arrow */}
          <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} className="shrink-0">
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
              <path d="M1 7h16M13 1l6 6-6 6" stroke="var(--accent-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>

          {/* MonPlateau */}
          <div
            className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'var(--accent-light)', border: '1px solid rgba(91,91,214,0.25)' }}
          >
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'var(--accent-primary)' }}>
                M
              </div>
              <motion.div animate={{ backgroundColor: color }} transition={{ duration: 0.35 }} className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: 'var(--bg-primary)' }} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>MonPlateau</div>
              <AnimatePresence mode="wait">
                <motion.div key={current} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.22 }} className="text-[10px]" style={{ color }}>
                  {current}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          Statut synchronisé automatiquement · toutes les 60 s
        </p>
      </div>
    </div>
  )
})

// ─────────────────────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = [
    { label: 'Fonctionnalités', href: '#features' },
    { label: 'Tarifs', href: '#pricing' },
    { label: 'À propos', href: '#about' },
  ]

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border-primary)' : '1px solid transparent',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <LogoMark size={30} />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>
            MonPlateau
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm transition-colors duration-200 no-underline"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="hidden sm:inline-flex items-center justify-center h-9 px-5 rounded-lg text-sm font-semibold no-underline transition-all duration-200"
            style={{ background: 'var(--accent-primary)', color: '#fff' }}
          >
            Se connecter
          </Link>

          <button
            className="md:hidden p-2 rounded-lg"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              {open ? (
                <path d="M4 4l12 12M16 4L4 16" strokeLinecap="round" />
              ) : (
                <>
                  <line x1="3" y1="6" x2="17" y2="6" strokeLinecap="round" />
                  <line x1="3" y1="10" x2="17" y2="10" strokeLinecap="round" />
                  <line x1="3" y1="14" x2="17" y2="14" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden"
            style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-primary)' }}
          >
            <div className="px-5 py-5 flex flex-col gap-4">
              {navLinks.map(({ label, href }) => (
                <a key={label} href={href} className="text-sm no-underline" style={{ color: 'var(--text-secondary)' }} onClick={() => setOpen(false)}>
                  {label}
                </a>
              ))}
              <Link
                href="/auth/login"
                className="flex items-center justify-center h-10 rounded-lg text-sm font-semibold no-underline"
                style={{ background: 'var(--accent-primary)', color: '#fff' }}
                onClick={() => setOpen(false)}
              >
                Se connecter
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

// ─────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
      {/* Dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(circle, #E4E4E7 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.7 }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-24 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Copy */}
          <div className="flex flex-col gap-7">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              <SectionBadge>✦ Bureau virtuel nouvelle génération</SectionBadge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.72, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 'clamp(38px, 6vw, 72px)',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.025em',
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Votre bureau{' '}
              <span style={{ color: 'var(--accent-primary)' }}>
                virtuel
              </span>
              ,<br />
              réinventé.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontSize: 19, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 480, margin: 0 }}
            >
              Retrouvez la spontanéité du bureau physique, sans quitter votre domicile.
              MonPlateau crée la présence là où vos équipes travaillent vraiment.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-wrap gap-3"
            >
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center h-12 px-8 rounded-xl text-base font-semibold no-underline transition-all duration-200"
                style={{ background: 'var(--accent-primary)', color: '#fff', boxShadow: 'var(--shadow-md)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent-primary)' }}
              >
                Essayer gratuitement
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center h-12 px-8 rounded-xl text-base font-semibold no-underline transition-all duration-200"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)' }}
              >
                Voir une démo →
              </a>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.44 }}
              style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}
            >
              ✦ Conçu pour les PME françaises en télétravail
            </motion.p>
          </div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <OfficeMapAnimation />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// FEATURE SECTION TEMPLATE
// ─────────────────────────────────────────────────────────────

function FeatureSection({
  id,
  badge,
  title,
  description,
  bullets,
  visual,
  flip = false,
  alt = false,
}: {
  id?: string
  badge: string
  title: string
  description: string
  bullets: string[]
  visual: React.ReactNode
  flip?: boolean
  alt?: boolean
}) {
  return (
    <section id={id} className="py-24" style={{ background: alt ? 'var(--bg-secondary)' : 'var(--bg-primary)', borderTop: '1px solid var(--border-primary)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className={flip ? 'lg:order-2' : ''}>
            <FadeUp><SectionBadge>{badge}</SectionBadge></FadeUp>
            <FadeUp delay={0.1} className="mt-4">
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(26px, 3.5vw, 42px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: '-0.02em', margin: 0 }}>
                {title}
              </h2>
            </FadeUp>
            <FadeUp delay={0.16} className="mt-4">
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.72, fontSize: 16, margin: 0 }}>{description}</p>
            </FadeUp>
            <FadeUp delay={0.22} className="mt-6">
              <ul className="flex flex-col gap-3">
                {bullets.map((b, i) => <CheckBullet key={i}>{b}</CheckBullet>)}
              </ul>
            </FadeUp>
          </div>

          <FadeUp delay={0.12} className={flip ? 'lg:order-1' : ''}>{visual}</FadeUp>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// HOW IT WORKS
// ─────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      icon: <div className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold text-white" style={{ background: '#5059C9' }}>T</div>,
      title: 'Connectez-vous avec Microsoft',
      desc: 'Un seul clic avec votre compte Microsoft 365. Aucun mot de passe supplémentaire.',
    },
    {
      num: '02',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="17" rx="2.5" /><path d="M8 4V2M16 4V2" strokeLinecap="round" /><path d="M3 9h18" />
        </svg>
      ),
      title: 'Créez votre organisation',
      desc: 'Configurez votre espace en quelques secondes. Choisissez votre plan de bureau.',
    },
    {
      num: '03',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.8">
          <circle cx="9" cy="7" r="4" /><circle cx="17" cy="5" r="3" />
          <path d="M2 21c0-4 3.1-7 7-7s7 3 7 7" strokeLinecap="round" />
          <path d="M17 11c2.5 0 4.5 2 4.5 4.5" strokeLinecap="round" />
        </svg>
      ),
      title: 'Invitez votre équipe',
      desc: "Partagez le lien d'invitation. Votre équipe rejoint le bureau en un clic.",
    },
  ]

  return (
    <section id="about" className="py-28 relative overflow-hidden" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
        <FadeUp className="text-center mb-16">
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(26px, 4vw, 48px)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: '0 0 12px' }}>
            Opérationnel en <span style={{ color: 'var(--accent-primary)' }}>3 minutes</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, margin: 0 }}>Pas d&apos;installation. Pas de configuration complexe.</p>
        </FadeUp>

        <div className="relative grid md:grid-cols-3 gap-6">
          <div
            aria-hidden
            className="hidden md:block absolute"
            style={{ top: '2.4rem', left: 'calc(16.67% + 32px)', right: 'calc(16.67% + 32px)', height: 1, background: 'linear-gradient(90deg,transparent,rgba(91,91,214,0.3) 30%,rgba(91,91,214,0.3) 70%,transparent)' }}
          />
          {steps.map((step, i) => (
            <FadeUp key={i} delay={i * 0.11}>
              <div className="relative flex flex-col gap-4 p-6 rounded-2xl h-full" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-light)', border: '1px solid rgba(91,91,214,0.2)' }}>
                    {step.icon}
                  </div>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 34, fontWeight: 800, color: 'rgba(91,91,214,0.12)', lineHeight: 1 }}>{step.num}</span>
                </div>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'var(--text-primary)', fontSize: 15, margin: 0 }}>{step.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────────────────────────

function PricingSection() {
  const [annual, setAnnual] = useState(false)

  const plans = [
    {
      name: 'Gratuit', price: '0€', period: '/mois', sub: 'Pour tester en équipe réduite.',
      features: ["Jusqu'à 5 utilisateurs", '1 bureau virtuel', 'Présence en temps réel', 'Audio spatial de base'],
      cta: 'Commencer', highlight: false,
    },
    {
      name: 'Pro', price: annual ? '4€' : '5€', period: '/utilisateur/mois', sub: "Pour les équipes qui s'agrandissent.",
      features: ['Utilisateurs illimités', 'Bureaux illimités', 'Intégration Microsoft Teams', 'Audio spatial avancé', 'Zones personnalisées', 'Support prioritaire'],
      cta: "Commencer l'essai", highlight: true,
    },
    {
      name: 'Entreprise', price: 'Sur devis', period: '', sub: 'Déploiement sécurisé à grande échelle.',
      features: ['SSO / SAML', 'Audit logs', 'SLA garanti', 'Intégrations sur mesure', 'Support dédié 24/7', 'On-premise possible'],
      cta: 'Nous contacter', highlight: false,
    },
  ]

  return (
    <section id="pricing" className="py-24" style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border-primary)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <FadeUp className="text-center mb-3">
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(26px, 4vw, 48px)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Simple et transparent
          </h2>
        </FadeUp>
        <FadeUp delay={0.1} className="text-center mb-10">
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, margin: '12px 0 0' }}>Pas de frais cachés. Changez de plan à tout moment.</p>
        </FadeUp>

        <FadeUp delay={0.14} className="flex justify-center mb-10">
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
            {([{ label: 'Mensuel', val: false }, { label: 'Annuel', val: true, badge: '−20%' }] as { label: string; val: boolean; badge?: string }[]).map(({ label, val, badge }) => (
              <button key={label} onClick={() => setAnnual(val)} className="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
                style={{
                  background: annual === val ? 'var(--bg-primary)' : 'transparent',
                  color: annual === val ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: annual === val ? 'var(--shadow-sm)' : 'none',
                }}>
                {label}
                {badge && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-light)', color: 'var(--accent-primary)' }}>{badge}</span>}
              </button>
            ))}
          </div>
        </FadeUp>

        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((plan, i) => (
            <FadeUp key={i} delay={i * 0.09}>
              <div
                className="relative flex flex-col gap-6 p-7 rounded-2xl h-full overflow-hidden"
                style={{
                  background: plan.highlight ? 'var(--accent-light)' : 'var(--bg-primary)',
                  border: plan.highlight ? '1px solid var(--accent-primary)' : '1px solid var(--border-primary)',
                  boxShadow: plan.highlight ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                }}
              >
                {plan.highlight && (
                  <div className="absolute top-4 right-4">
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--accent-primary)', color: '#fff' }}>Populaire</span>
                  </div>
                )}
                <div>
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'var(--text-primary)', fontSize: 18, margin: 0 }}>{plan.name}</h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{plan.sub}</p>
                </div>
                <div className="flex items-end gap-1">
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: plan.price === 'Sur devis' ? 22 : 36, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{plan.price}</span>
                  {plan.period && <span className="text-xs pb-1.5" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>}
                </div>
                <ul className="flex flex-col gap-2.5 flex-1">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                        <circle cx="8" cy="8" r="8" fill={plan.highlight ? 'var(--accent-primary)' : 'var(--bg-tertiary)'} fillOpacity={plan.highlight ? 0.15 : 1} />
                        <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke={plan.highlight ? 'var(--accent-primary)' : 'var(--text-muted)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/login" className="flex items-center justify-center h-10 rounded-xl text-sm font-semibold no-underline transition-all duration-200"
                  style={plan.highlight
                    ? { background: 'var(--accent-primary)', color: '#fff' }
                    : { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }
                  }
                  onMouseEnter={(e) => {
                    if (plan.highlight) e.currentTarget.style.background = 'var(--accent-hover)'
                    else e.currentTarget.style.background = 'var(--bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    if (plan.highlight) e.currentTarget.style.background = 'var(--accent-primary)'
                    else e.currentTarget.style.background = 'var(--bg-secondary)'
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// CTA BANNER
// ─────────────────────────────────────────────────────────────

function CTABanner() {
  return (
    <section className="py-28 relative overflow-hidden" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 60%, rgba(91,91,214,0.06) 0%, transparent 65%)' }} />
      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <FadeUp>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(26px, 4.5vw, 52px)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.15, letterSpacing: '-0.025em', margin: 0 }}>
            Rejoignez les équipes qui{' '}
            <span style={{ color: 'var(--accent-primary)' }}>
              travaillent mieux ensemble
            </span>
          </h2>
        </FadeUp>
        <FadeUp delay={0.12} className="mt-5">
          <p style={{ color: 'var(--text-secondary)', fontSize: 18, margin: 0 }}>Essai gratuit 30 jours. Sans carte bancaire.</p>
        </FadeUp>
        <FadeUp delay={0.22} className="mt-9">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center h-14 px-10 rounded-2xl text-lg font-semibold no-underline transition-all duration-200"
            style={{ background: 'var(--accent-primary)', color: '#fff', boxShadow: 'var(--shadow-md)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent-primary)' }}
          >
            Commencer gratuitement →
          </Link>
        </FadeUp>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────

function Footer() {
  const cols = [
    { title: 'Produit', links: ['Fonctionnalités', 'Tarifs', 'Changelog', 'Roadmap'] },
    { title: 'Ressources', links: ['Documentation', 'Blog', 'Support', 'Statut'] },
    { title: 'Légal', links: ['Mentions légales', 'Confidentialité', 'CGU', 'RGPD'] },
  ]
  return (
    <footer className="py-16" style={{ borderTop: '1px solid var(--border-primary)', background: 'var(--bg-tertiary)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <LogoMark size={26} />
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>MonPlateau</span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.65 }}>Votre bureau virtuel, réinventé pour les équipes hybrides modernes.</p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>{col.title}</h4>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm no-underline transition-colors duration-150" style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-8 text-sm" style={{ borderTop: '1px solid var(--border-primary)', color: 'var(--text-muted)' }}>
          <p>Fait avec ❤️ en France</p>
          <p>© 2024 MonPlateau. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar />
      <HeroSection />
      <FeatureSection
        id="features"
        badge="Bureau Virtuel"
        title="Voyez qui est disponible en un coup d'œil"
        description="Fini les emails pour savoir si quelqu'un est libre. Regardez simplement votre bureau virtuel — les avatars vous disent tout."
        bullets={['Statuts synchronisés avec Microsoft Teams', 'Avatars en temps réel sur la carte', 'Zones dédiées (Open Space, Réunion, Focus)', 'Présence visible sans caméra']}
        visual={<OfficeMapAnimation />}
      />
      <FeatureSection
        badge="Audio Intelligent"
        title="Entendez seulement ce qui vous concerne"
        description="L'audio s'adapte à votre position. Rapprochez-vous d'un collègue pour l'entendre. Fermez la porte d'une salle de réunion pour une conversation privée."
        bullets={['Volume basé sur la distance entre avatars', 'Salles fermées pour les réunions privées', 'Zone Focus : micro coupé automatiquement']}
        visual={<AudioSpatialViz />}
        flip
        alt
      />
      <FeatureSection
        badge="Intégration Native"
        title="Connecté à votre écosystème Microsoft"
        description="MonPlateau lit votre statut Teams en temps réel. En réunion ? Votre avatar le signale automatiquement. Pas de double saisie, pas d'effort supplémentaire."
        bullets={["Statut Teams affiché sur votre avatar", 'Connexion SSO Microsoft 365', 'Synchronisation automatique toutes les 60 s']}
        visual={<TeamsIntegrationViz />}
      />
      <HowItWorksSection />
      <PricingSection />
      <CTABanner />
      <Footer />
    </main>
  )
}
