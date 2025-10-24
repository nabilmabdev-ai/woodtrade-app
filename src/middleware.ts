// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } })

  // ✅ Use the new cookies API pattern for Next.js 15+
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          return req.cookies.get(name)?.value
        },
        async set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options })
        },
        async remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  console.log(`[SSR MIDDLEWARE] Path: ${pathname} | Session: ${session ? 'Exists' : 'None'}`)

  // redirect logic
  if (!session && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}