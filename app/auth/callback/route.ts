import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  console.log('[callback] Full URL:', request.url)
  console.log('[callback] All params:', Object.fromEntries(new URL(request.url).searchParams))
  console.log('[callback] Hash would not be visible server-side')

  const { searchParams } = new URL(request.url)
  // log every param individually
  searchParams.forEach((value, key) => {
    console.log(`[callback] param: ${key} = ${value}`)
  })

  const code = searchParams.get('code')
  console.log('[callback] code:', code)

  const next = searchParams.get('next') ?? '/dashboard/office'

  if (!code) {
    console.error('[auth/callback] No code in URL')
    return NextResponse.redirect('http://localhost:3000/auth/login?error=missing_code')
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(`http://localhost:3000/auth/login?error=${error.message}`)
  }

  return NextResponse.redirect(`http://localhost:3000${next}`)
}
