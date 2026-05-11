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
      style={{ backgroundColor: '#0A0A0F' }}
    >
      {/* Dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #1E1E2E 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.55,
        }}
      />

      {/* Gradient blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute rounded-full opacity-20 blur-[120px]"
          style={{
            width: 600,
            height: 600,
            top: '-15%',
            left: '-10%',
            background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)',
            animation: 'blob-drift 14s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full opacity-15 blur-[100px]"
          style={{
            width: 500,
            height: 500,
            bottom: '-10%',
            right: '-8%',
            background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)',
            animation: 'blob-drift 18s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* Back link */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm no-underline transition-colors duration-150 z-10"
        style={{ color: '#64748B' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#94A3B8')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 2L4 7l5 5" />
        </svg>
        Retour à l&apos;accueil
      </Link>

      {/* Login card */}
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm px-6">
        {/* Logo + brand */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
              boxShadow: '0 0 40px rgba(99,102,241,0.45)',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none" aria-hidden>
              <rect x="3" y="3" width="10" height="10" rx="2.5" fill="white" fillOpacity="0.9" />
              <rect x="15" y="3" width="10" height="10" rx="2.5" fill="white" fillOpacity="0.6" />
              <rect x="3" y="15" width="10" height="10" rx="2.5" fill="white" fillOpacity="0.6" />
              <rect x="15" y="15" width="10" height="10" rx="2.5" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1
              className="font-bold text-4xl tracking-tight"
              style={{
                fontFamily: "'Syne', sans-serif",
                background: 'linear-gradient(135deg, #818CF8 0%, #6366F1 40%, #22D3EE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              MonPlateau
            </h1>
            <p className="text-sm text-center" style={{ color: '#64748B', fontFamily: "'DM Sans', sans-serif" }}>
              Votre bureau virtuel, réinventé.
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="w-full rounded-2xl p-8 flex flex-col gap-6"
          style={{
            backgroundColor: '#13131A',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 8px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex flex-col gap-2 text-center">
            <h2 className="font-semibold text-xl" style={{ fontFamily: "'Syne', sans-serif", color: '#F1F5F9' }}>
              Bienvenue
            </h2>
            <p className="text-sm" style={{ color: '#64748B', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
              Connectez-vous avec votre compte Microsoft pour accéder à votre espace.
            </p>
          </div>

          <button
            onClick={handleMicrosoftLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-13 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              height: 52,
              backgroundColor: '#ffffff',
              color: '#1a1a1a',
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: loading ? 'none' : '0 2px 12px rgba(0,0,0,0.35)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f0f0f0'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.45)'
              }
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffffff'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = loading ? 'none' : '0 2px 12px rgba(0,0,0,0.35)'
            }}
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
                <rect x="1" y="1" width="8.5" height="8.5" fill="#F25022" />
                <rect x="10.5" y="1" width="8.5" height="8.5" fill="#7FBA00" />
                <rect x="1" y="10.5" width="8.5" height="8.5" fill="#00A4EF" />
                <rect x="10.5" y="10.5" width="8.5" height="8.5" fill="#FFB900" />
              </svg>
            )}
            <span className="text-base font-semibold">
              {loading ? 'Connexion…' : 'Se connecter avec Microsoft'}
            </span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-xs" style={{ color: '#475569' }}>sécurisé par Microsoft</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          <p className="text-xs text-center" style={{ color: '#475569', lineHeight: 1.55 }}>
            En vous connectant, vous acceptez nos{' '}
            <a href="#" className="no-underline" style={{ color: '#6366F1' }}>conditions d&apos;utilisation</a>
            {' '}et notre{' '}
            <a href="#" className="no-underline" style={{ color: '#6366F1' }}>politique de confidentialité</a>.
          </p>
        </div>

        {/* Footer */}
        <p className="text-xs text-center" style={{ color: '#475569', fontFamily: "'DM Sans', sans-serif" }}>
          Pour les équipes hybrides&nbsp;•&nbsp;MonPlateau 2024
        </p>
      </div>
    </div>
  )
}
