'use client'

import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = React.useState(false)

  async function handleMicrosoftLogin() {
    setLoading(true)
    const supabase = createClient()
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo,
        scopes: 'openid profile email offline_access User.Read Presence.Read',
      },
    })
    if (error) {
      console.error('[login] signInWithOAuth error:', error.message)
      setLoading(false)
    }
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* Dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #E4E4E7 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.7,
        }}
      />

      {/* Back link */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm no-underline transition-colors duration-150 z-10"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 2L4 7l5 5" />
        </svg>
        Retour à l&apos;accueil
      </Link>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm px-6">
        {/* Logo + brand */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--accent-primary)' }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
              <rect x="3" y="3" width="10" height="10" rx="2.5" fill="white" fillOpacity="0.9" />
              <rect x="15" y="3" width="10" height="10" rx="2.5" fill="white" fillOpacity="0.6" />
              <rect x="3" y="15" width="10" height="10" rx="2.5" fill="white" fillOpacity="0.6" />
              <rect x="15" y="15" width="10" height="10" rx="2.5" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1
              className="font-bold text-3xl tracking-tight"
              style={{ fontFamily: "'Syne', sans-serif", color: 'var(--accent-primary)' }}
            >
              MonPlateau
            </h1>
            <p className="text-sm text-center" style={{ color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif" }}>
              Votre bureau virtuel, réinventé.
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="w-full rounded-xl p-8 flex flex-col gap-6"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="flex flex-col gap-2 text-center">
            <h2 className="font-semibold text-xl" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
              Bienvenue
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
              Connectez-vous avec votre compte Microsoft pour accéder à votre espace.
            </p>
          </div>

          <button
            onClick={handleMicrosoftLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              height: 48,
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'var(--bg-hover)'
                e.currentTarget.style.borderColor = 'var(--border-secondary)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-primary)'
              e.currentTarget.style.borderColor = 'var(--border-primary)'
            }}
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <rect x="1" y="1" width="8.5" height="8.5" fill="#F25022" />
                <rect x="10.5" y="1" width="8.5" height="8.5" fill="#7FBA00" />
                <rect x="1" y="10.5" width="8.5" height="8.5" fill="#00A4EF" />
                <rect x="10.5" y="10.5" width="8.5" height="8.5" fill="#FFB900" />
              </svg>
            )}
            <span className="text-sm font-semibold">
              {loading ? 'Connexion…' : 'Se connecter avec Microsoft'}
            </span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>sécurisé par Microsoft</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
          </div>

          <p className="text-xs text-center" style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>
            En vous connectant, vous acceptez nos{' '}
            <a href="#" className="no-underline" style={{ color: 'var(--accent-primary)' }}>conditions d&apos;utilisation</a>
            {' '}et notre{' '}
            <a href="#" className="no-underline" style={{ color: 'var(--accent-primary)' }}>politique de confidentialité</a>.
          </p>
        </div>

        {/* Footer */}
        <p className="text-xs text-center" style={{ color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>
          Pour les équipes hybrides&nbsp;•&nbsp;MonPlateau 2024
        </p>
      </div>
    </div>
  )
}
