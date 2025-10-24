// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * This middleware is "lightweight" and compatible with the Edge runtime.
 * Its primary responsibilities are:
 * 1.  Checking for a valid user session.
 * 2.  Redirecting unauthenticated users to the login page.
 * 3.  Redirecting authenticated users away from the login page.
 *
 * It DOES NOT perform database lookups (e.g., using Prisma) or complex authorization checks.
 * Role-based access control must be handled within individual API routes or Server Components.
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Log the request path and session status for debugging.
  console.log(`[MIDDLEWARE] Path: ${pathname} | Session: ${session ? 'Exists' : 'None'}`);

  // If the user is not authenticated and is trying to access a protected route,
  // redirect them to the login page.
  if (!session && pathname !== '/login') {
    console.log('[MIDDLEWARE] No session found. Redirecting to /login.');
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If the user is authenticated and tries to access the login page,
  // redirect them to the main dashboard.
  if (session && pathname === '/login') {
    console.log('[MIDDLEWARE] Session found. Redirecting from /login to dashboard.');
    return NextResponse.redirect(new URL('/', req.url));
  }

  // If the request passes the authentication checks, allow it to proceed.
  // Role-based authorization will be handled by the specific API routes or page components.
  return res;
}

export const config = {
  // This matcher ensures the middleware runs on all routes except for:
  // - /api/auth (Supabase's internal auth routes)
  // - Next.js static files (_next/static)
  // - Next.js image optimization files (_next/image)
  // - The favicon.ico file
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
