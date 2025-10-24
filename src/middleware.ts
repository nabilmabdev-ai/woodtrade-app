// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // create a response wrapper
  const res = NextResponse.next();

  // createMiddlewareClient gère cookies/NextResponse automatiquement
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('[MIDDLEWARE LOG] getSession() null mais getUser() ok:', user.email);
      // tu peux considérer la requête comme authentifiée (fallback)
    }
  }

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
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
