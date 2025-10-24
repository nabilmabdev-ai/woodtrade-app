// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Create a response object that we can modify
  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  // Create a Supabase client configured for Middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Update the request's cookies for the current server-side render
          req.cookies.set({ name, value, ...options });
          // Also update the response's cookies to send back to the browser
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          // Update the request's and response's cookies
          req.cookies.set({ name, value: '', ...options });
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // This is the crucial step: It attempts to refresh the session cookie.
  const { data: { session } } = await supabase.auth.getSession();

  // Redirect logic
  const { pathname } = req.nextUrl;
  if (!session && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};