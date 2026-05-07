'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { LAYOUTS } from '@/lib/canvas/layouts'
import type { MapTheme } from '@/lib/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepProps {
  direction: number
  onNext: () => void
  onBack?: () => void
}

// ─── Step slide animation ─────────────────────────────────────────────────────

const variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -80 : 80,
    opacity: 0,
  }),
}

const transition = { duration: 0.28, ease: [0.32, 0.72, 0, 1] as number[] }

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            backgroundColor:
              i === current
                ? '#6366F1'
                : i < current
                ? '#4F52C9'
                : '#1E1E2E',
          }}
        />
      ))}
    </div>
  )
}

// ─── Step 1: Org Setup ────────────────────────────────────────────────────────

function StepOrgSetup({
  direction,
  onNext,
  orgId,
  setOrgId,
}: StepProps & { orgId: string; setOrgId: (id: string) => void }) {
  const [orgName, setOrgName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prevent unused warning — orgId is used by parent to pass down
  void orgId

  function handleNameChange(val: string) {
    setOrgName(val)
    if (!slugManual) setSlug(slugify(val))
  }

  function handleSlugChange(val: string) {
    setSlugManual(true)
    setSlug(slugify(val))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim() || !slug.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError("Session expirée. Veuillez vous reconnecter.")
      setLoading(false)
      return
    }

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName.trim(),
        slug: slug.trim(),
        plan: 'free',
        max_users: 10,
        logo_url: null,
      })
      .select('id')
      .single()

    if (orgError) {
      setError(orgError.message)
      setLoading(false)
      return
    }

    // Create / upsert profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      organization_id: org.id,
      display_name:
        user.user_metadata?.full_name ??
        user.email?.split('@')[0] ??
        'Membre',
      avatar_url: user.user_metadata?.avatar_url ?? null,
      role: 'admin',
      ms_access_token: null,
      teams_status: null,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    setOrgId(org.id)
    setLoading(false)
    onNext()
  }

  return (
    <motion.div
      key="step1"
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      className="w-full"
    >
      <div className="flex flex-col gap-1 mb-8">
        <h2
          className="font-display font-bold text-2xl"
          style={{ color: '#F1F5F9' }}
        >
          Créez votre organisation
        </h2>
        <p className="font-sans text-sm" style={{ color: '#64748B' }}>
          C&apos;est l&apos;espace partagé de votre équipe sur LePlateau.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs font-medium uppercase tracking-wide font-sans"
            style={{ color: '#64748B' }}
          >
            Nom de l&apos;organisation
          </label>
          <input
            value={orgName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Acme Corp"
            required
            className="w-full h-10 px-3 rounded-lg font-sans text-sm outline-none transition-all duration-150"
            style={{
              backgroundColor: '#13131A',
              border: '1px solid #1E1E2E',
              color: '#F1F5F9',
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = '1px solid #6366F1'
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.25)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = '1px solid #1E1E2E'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs font-medium uppercase tracking-wide font-sans"
            style={{ color: '#64748B' }}
          >
            Identifiant URL
          </label>
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{ border: '1px solid #1E1E2E', backgroundColor: '#13131A' }}
          >
            <span
              className="px-3 h-10 flex items-center font-mono text-xs shrink-0 border-r"
              style={{ color: '#64748B', borderColor: '#1E1E2E' }}
            >
              leplateau.app/
            </span>
            <input
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="acme-corp"
              required
              className="flex-1 h-10 px-3 font-mono text-sm outline-none bg-transparent"
              style={{ color: '#F1F5F9' }}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm font-sans" style={{ color: '#f87171' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !orgName.trim() || !slug.trim()}
          className="w-full h-11 rounded-xl font-sans font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: '#6366F1',
            color: '#F1F5F9',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#818CF8'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 0 20px rgba(99,102,241,0.45)'
            }
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6366F1'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
          }}
        >
          {loading ? 'Création…' : 'Continuer →'}
        </button>
      </form>
    </motion.div>
  )
}

// ─── Step 2: Office Theme ─────────────────────────────────────────────────────

const THEMES: {
  key: MapTheme
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    key: 'modern',
    label: 'Modern',
    description: 'Open space, salles de réunion, zones focus.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
        <rect x="2" y="14" width="32" height="18" rx="3" fill="#6366F1" fillOpacity="0.25" stroke="#6366F1" strokeWidth="1.5" />
        <rect x="8" y="6" width="8" height="10" rx="2" fill="#6366F1" fillOpacity="0.5" />
        <rect x="20" y="8" width="8" height="8" rx="2" fill="#6366F1" fillOpacity="0.4" />
        <rect x="6" y="20" width="6" height="6" rx="1.5" fill="#818CF8" fillOpacity="0.6" />
        <rect x="15" y="20" width="6" height="6" rx="1.5" fill="#818CF8" fillOpacity="0.6" />
        <rect x="24" y="20" width="6" height="6" rx="1.5" fill="#818CF8" fillOpacity="0.6" />
      </svg>
    ),
  },
  {
    key: 'zen',
    label: 'Zen',
    description: 'Espace calme, méditation, cercles doux.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
        <circle cx="18" cy="18" r="14" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.5" />
        <path d="M18 6 C12 12 8 18 18 24 C28 18 24 12 18 6Z" fill="#10B981" fillOpacity="0.25" />
        <path d="M18 24 C14 28 14 32 18 32 C22 32 22 28 18 24Z" fill="#10B981" fillOpacity="0.4" />
        <circle cx="18" cy="18" r="3" fill="#10B981" fillOpacity="0.7" />
      </svg>
    ),
  },
  {
    key: 'startup',
    label: 'Startup',
    description: 'War room, Build space, Deep work.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
        <path d="M18 4 L20 14 L30 14 L22 20 L25 30 L18 24 L11 30 L14 20 L6 14 L16 14 Z" fill="#F59E0B" fillOpacity="0.3" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="18" cy="16" r="4" fill="#F59E0B" fillOpacity="0.6" />
      </svg>
    ),
  },
]

function StepTheme({
  direction,
  onNext,
  onBack,
  orgId,
  setMapId,
}: StepProps & { orgId: string; setMapId: (id: string) => void }) {
  const [selected, setSelected] = useState<MapTheme | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleContinue() {
    if (!selected || !orgId) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    // Create office map
    const { data: map, error: mapError } = await supabase
      .from('office_maps')
      .insert({
        organization_id: orgId,
        name: `Bureau ${selected}`,
        layout_json: {},
        theme: selected,
      })
      .select('id')
      .single()

    if (mapError || !map) {
      setError(mapError?.message ?? 'Erreur lors de la création de la carte')
      setLoading(false)
      return
    }

    // Create default zones from layout
    const zones = LAYOUTS[selected] ?? []
    const zonesInsert = zones.map((z) => ({
      ...z,
      office_map_id: map.id,
    }))

    if (zonesInsert.length > 0) {
      const { data: createdZones, error: zonesError } = await supabase
        .from('zones')
        .insert(zonesInsert)
        .select('id, type')

      if (zonesError) {
        setError(zonesError.message)
        setLoading(false)
        return
      }

      // Create LiveKit rooms for meeting_room zones
      const meetingZones = (createdZones ?? []).filter(
        (z) => z.type === 'meeting_room'
      )
      if (meetingZones.length > 0) {
        const livekitRooms = meetingZones.map((z) => ({
          zone_id: z.id,
          room_name: `room-${z.id}`,
          is_active: false,
        }))
        await supabase.from('livekit_rooms').insert(livekitRooms)
      }
    }

    setMapId(map.id)
    setLoading(false)
    onNext()
  }

  return (
    <motion.div
      key="step2"
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      className="w-full"
    >
      <div className="flex flex-col gap-1 mb-8">
        <h2
          className="font-display font-bold text-2xl"
          style={{ color: '#F1F5F9' }}
        >
          Choisissez votre ambiance
        </h2>
        <p className="font-sans text-sm" style={{ color: '#64748B' }}>
          L&apos;apparence de votre bureau virtuel et les zones par défaut.
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        {THEMES.map((theme) => {
          const isSelected = selected === theme.key
          return (
            <button
              key={theme.key}
              onClick={() => setSelected(theme.key)}
              className="flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200"
              style={{
                backgroundColor: isSelected ? 'rgba(99,102,241,0.12)' : '#13131A',
                border: isSelected
                  ? '1px solid #6366F1'
                  : '1px solid #1E1E2E',
                boxShadow: isSelected
                  ? '0 0 0 1px rgba(99,102,241,0.2), 0 0 16px rgba(99,102,241,0.15)'
                  : 'none',
              }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
              >
                {theme.icon}
              </div>
              <div className="flex flex-col gap-0.5 flex-1">
                <span
                  className="font-display font-semibold text-base"
                  style={{ color: isSelected ? '#818CF8' : '#F1F5F9' }}
                >
                  {theme.label}
                </span>
                <span className="font-sans text-sm" style={{ color: '#64748B' }}>
                  {theme.description}
                </span>
              </div>
              {isSelected && (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="shrink-0"
                >
                  <circle cx="10" cy="10" r="9" stroke="#6366F1" strokeWidth="1.5" />
                  <path
                    d="M6 10.5l3 3 5-6"
                    stroke="#6366F1"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <p className="text-sm font-sans mb-4" style={{ color: '#f87171' }}>
          {error}
        </p>
      )}

      <div className="flex gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex-1 h-11 rounded-xl font-sans font-medium text-sm transition-all duration-200"
            style={{
              border: '1px solid #1E1E2E',
              backgroundColor: 'transparent',
              color: '#64748B',
            }}
          >
            ← Retour
          </button>
        )}
        <button
          onClick={handleContinue}
          disabled={!selected || loading}
          className="flex-1 h-11 rounded-xl font-sans font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#6366F1', color: '#F1F5F9' }}
          onMouseEnter={(e) => {
            if (selected && !loading) {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#818CF8'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 0 20px rgba(99,102,241,0.45)'
            }
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6366F1'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
          }}
        >
          {loading ? 'Création…' : 'Continuer →'}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Step 3: Invite Teammates ─────────────────────────────────────────────────

function StepInvite({
  direction,
  onNext,
  onBack,
}: StepProps) {
  const [email, setEmail] = useState('')
  const [emails, setEmails] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addEmail() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) return
    if (emails.includes(trimmed)) {
      setEmail('')
      return
    }
    setEmails((prev) => [...prev, trimmed])
    setEmail('')
  }

  function removeEmail(e: string) {
    setEmails((prev) => prev.filter((x) => x !== e))
  }

  async function sendInvites() {
    if (emails.length === 0) return
    setSending(true)
    setError(null)

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      })

      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Erreur lors de l\'envoi')
      }

      setSent(true)
      setTimeout(() => onNext(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSending(false)
    }
  }

  return (
    <motion.div
      key="step3"
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      className="w-full"
    >
      <div className="flex flex-col gap-1 mb-8">
        <h2
          className="font-display font-bold text-2xl"
          style={{ color: '#F1F5F9' }}
        >
          Invitez votre équipe
        </h2>
        <p className="font-sans text-sm" style={{ color: '#64748B' }}>
          Ajoutez des collègues pour collaborer dans votre bureau virtuel.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addEmail()
              }
            }}
            placeholder="collegue@entreprise.com"
            className="flex-1 h-10 px-3 rounded-lg font-sans text-sm outline-none transition-all duration-150"
            style={{
              backgroundColor: '#13131A',
              border: '1px solid #1E1E2E',
              color: '#F1F5F9',
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = '1px solid #6366F1'
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.25)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = '1px solid #1E1E2E'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          <button
            onClick={addEmail}
            disabled={!email.trim()}
            className="h-10 px-4 rounded-lg font-sans font-medium text-sm transition-all duration-200 disabled:opacity-40"
            style={{
              border: '1px solid #6366F1',
              backgroundColor: 'rgba(99,102,241,0.15)',
              color: '#818CF8',
            }}
          >
            Ajouter
          </button>
        </div>

        {emails.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {emails.map((e) => (
              <span
                key={e}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-sans text-xs"
                style={{
                  backgroundColor: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  color: '#818CF8',
                }}
              >
                {e}
                <button
                  onClick={() => removeEmail(e)}
                  className="hover:opacity-60 transition-opacity"
                  aria-label={`Retirer ${e}`}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 2l8 8M10 2l-8 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm font-sans" style={{ color: '#f87171' }}>
            {error}
          </p>
        )}

        {sent && (
          <p className="text-sm font-sans" style={{ color: '#34d399' }}>
            Invitations envoyées !
          </p>
        )}

        <div className="flex gap-3 mt-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex-1 h-11 rounded-xl font-sans font-medium text-sm transition-all duration-200"
              style={{
                border: '1px solid #1E1E2E',
                backgroundColor: 'transparent',
                color: '#64748B',
              }}
            >
              ← Retour
            </button>
          )}
          <button
            onClick={sendInvites}
            disabled={emails.length === 0 || sending || sent}
            className="flex-1 h-11 rounded-xl font-sans font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#6366F1', color: '#F1F5F9' }}
            onMouseEnter={(e) => {
              if (emails.length > 0 && !sending) {
                ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#818CF8'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 0 20px rgba(99,102,241,0.45)'
              }
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6366F1'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
            }}
          >
            {sending ? 'Envoi…' : sent ? 'Envoyées ✓' : 'Envoyer les invitations'}
          </button>
        </div>

        <button
          onClick={onNext}
          className="text-center font-sans text-sm transition-colors"
          style={{ color: '#64748B' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#F1F5F9'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#64748B'
          }}
        >
          Passer cette étape →
        </button>
      </div>
    </motion.div>
  )
}

// ─── Main Onboarding Page ─────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [orgId, setOrgId] = useState('')
  const [mapId, setMapId] = useState('')

  // Prevent mapId unused warning
  void mapId

  const goNext = useCallback(() => {
    setDirection(1)
    setStep((s) => s + 1)
  }, [])

  const goBack = useCallback(() => {
    setDirection(-1)
    setStep((s) => s - 1)
  }, [])

  const finish = useCallback(() => {
    router.push('/dashboard/office')
  }, [router])

  const TOTAL_STEPS = 3

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#0A0A0F' }}
    >
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute rounded-full opacity-20 blur-[120px]"
          style={{
            width: 500,
            height: 500,
            top: '-10%',
            right: '-10%',
            background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)',
            animation: 'blob-drift 16s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full opacity-15 blur-[100px]"
          style={{
            width: 400,
            height: 400,
            bottom: '-5%',
            left: '-5%',
            background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)',
            animation: 'blob-drift 20s ease-in-out infinite reverse',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1 mb-10">
          <span
            className="font-display font-bold text-2xl"
            style={{
              background: 'linear-gradient(135deg, #818CF8 0%, #6366F1 50%, #22D3EE 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            LePlateau
          </span>
          <ProgressDots current={step} total={TOTAL_STEPS} />
        </div>

        {/* Card */}
        <div
          className="w-full rounded-2xl p-8 overflow-hidden"
          style={{
            backgroundColor: '#13131A',
            boxShadow:
              '0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)',
          }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            {step === 0 && (
              <StepOrgSetup
                key="step1"
                direction={direction}
                onNext={goNext}
                orgId={orgId}
                setOrgId={setOrgId}
              />
            )}
            {step === 1 && (
              <StepTheme
                key="step2"
                direction={direction}
                onNext={goNext}
                onBack={goBack}
                orgId={orgId}
                setMapId={setMapId}
              />
            )}
            {step === 2 && (
              <StepInvite
                key="step3"
                direction={direction}
                onNext={finish}
                onBack={goBack}
              />
            )}
          </AnimatePresence>
        </div>

        <p
          className="text-center font-sans text-xs mt-6"
          style={{ color: '#64748B' }}
        >
          Étape {step + 1} sur {TOTAL_STEPS}
        </p>
      </div>
    </div>
  )
}
