// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } })

  // Utilise le nouveau modèle de cookies pour Next.js 15+
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

  console.log(`[MIDDLEWARE] Path: ${pathname} | Session: ${session ? 'YES' : 'NO'}`)

  // Si l'utilisateur n'est pas connecté et que le chemin actuel n'est pas la page de connexion, le rediriger vers la page de connexion
  if (!session && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Si l'utilisateur est connecté et que le chemin actuel est la page de connexion, le rediriger vers la page d'accueil
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}