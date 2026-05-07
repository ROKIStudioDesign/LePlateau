'use client'

import React from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = React.useState(false)

  async function handleMicrosoftLogin() {
    setLoading(true)
    const supabase = createClient()
    console.log('[login] Starting OAuth with redirectTo:', 'http://localhost:3000/auth/callback')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback',
        scopes: 'openid profile email offline_access User.Read Presence.Read',
      },
    })
    console.log('[login] signInWithOAuth result:', { data, error })
    if (error) {
      console.error('[login] signInWithOAuth error:', error.message)
      setLoading(false)
    }
    // On success the browser navigates away; loading stays true intentionally.
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#0A0A0F' }}
    >
      {/* Animated gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute rounded-full opacity-25 blur-[120px]"
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
          className="absolute rounded-full opacity-20 blur-[100px]"
          style={{
            width: 500,
            height: 500,
            bottom: '-10%',
            right: '-8%',
            background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)',
            animation: 'blob-drift 18s ease-in-out infinite reverse',
          }}
        />
        <div
          className="absolute rounded-full opacity-15 blur-[140px]"
          style={{
            width: 400,
            height: 400,
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, #818CF8 0%, transparent 70%)',
            animation: 'blob-drift 22s ease-in-out infinite',
            animationDelay: '4s',
          }}
        />
      </div>

      {/* Dot grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Login card */}
      <div
        className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm px-6"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
                boxShadow: '0 0 32px rgba(99,102,241,0.4)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
                <rect x="3" y="3" width="10" height="10" rx="2.5" fill="white" fillOpacity="0.9" />
                <rect x="15" y="3" width="10" height="10" rx="2.5" fill="white" fillOpacity="0.6" />
                <rect x="3" y="15" width="10" height="10" rx="2.5" fill="white" fillOpacity="0.6" />
                <rect x="15" y="15" width="10" height="10" rx="2.5" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
          </div>
          <h1
            className="font-display font-bold text-4xl tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #818CF8 0%, #6366F1 40%, #22D3EE 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            LePlateau
          </h1>
          <p className="font-sans text-sm text-center" style={{ color: '#64748B' }}>
            Votre bureau virtuel, réinventé.
          </p>
        </div>

        {/* Card */}
        <div
          className="w-full rounded-2xl p-8 flex flex-col gap-6"
          style={{
            backgroundColor: '#13131A',
            boxShadow:
              '0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex flex-col gap-2 text-center">
            <h2
              className="font-display font-semibold text-xl"
              style={{ color: '#F1F5F9' }}
            >
              Bienvenue
            </h2>
            <p className="font-sans text-sm" style={{ color: '#64748B' }}>
              Connectez-vous avec votre compte Microsoft pour accéder à votre espace.
            </p>
          </div>

          <button
            onClick={handleMicrosoftLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-12 rounded-xl font-sans font-medium text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#ffffff',
              color: '#1a1a1a',
              boxShadow: loading ? 'none' : '0 2px 8px rgba(0,0,0,0.3)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f3f3f3'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 4px 16px rgba(0,0,0,0.4)'
              }
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffffff'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 2px 8px rgba(0,0,0,0.3)'
            }}
          >
            {loading ? (
              <svg
                className="w-5 h-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            ) : (
              /* Microsoft 4-square logo */
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden
              >
                <rect x="1" y="1" width="8.5" height="8.5" fill="#F25022" />
                <rect x="10.5" y="1" width="8.5" height="8.5" fill="#7FBA00" />
                <rect x="1" y="10.5" width="8.5" height="8.5" fill="#00A4EF" />
                <rect x="10.5" y="10.5" width="8.5" height="8.5" fill="#FFB900" />
              </svg>
            )}
            {loading ? 'Connexion…' : 'Se connecter avec Microsoft'}
          </button>
        </div>

        {/* Footer */}
        <p className="font-sans text-xs text-center" style={{ color: '#64748B' }}>
          Pour les équipes hybrides&nbsp;•&nbsp;LePlateau 2024
        </p>
      </div>
    </div>
  )
}
