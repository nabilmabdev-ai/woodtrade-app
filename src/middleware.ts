// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // ✅ FIX: Changed 'let' to 'const' to satisfy the ESLint rule.
  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // The middleware is the only place that should modify the response cookies.
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // This call will correctly refresh the session cookie.
  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // If user is not signed in and the current path is not /login, redirect the user to /login
  if (!session && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If user is signed in and the current path is /login, redirect the user to /
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};