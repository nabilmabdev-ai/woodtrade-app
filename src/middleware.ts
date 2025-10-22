// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

const accessRules: { path: string; roles: Role[] }[] = [
  { path: '/api/users', roles: [Role.ADMIN, Role.SUPER_ADMIN] },
  { path: '/users', roles: [Role.ADMIN, Role.SUPER_ADMIN] },
  { path: '/api/inventory/adjust', roles: [Role.WAREHOUSE, Role.ADMIN, Role.SUPER_ADMIN] },
  { path: '/inventory/adjust', roles: [Role.WAREHOUSE, Role.ADMIN, Role.SUPER_ADMIN] },
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  console.log(`[MIDDLEWARE] Path=${pathname} | Session=${session ? "YES" : "NO"}`);

  if (!session && pathname !== '/login') {
    console.log(`[MIDDLEWARE] No session → redirecting to /login`);
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (session && pathname === '/login') {
    console.log(`[MIDDLEWARE] Already logged in → redirecting to /`);
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (!session) {
    console.log(`[MIDDLEWARE] Letting through without session`);
    return res;
  }

  let userFromDb = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!userFromDb) {
    console.log(`[MIDDLEWARE] User ${session.user.id} not found in DB → creating...`);
    try {
      await prisma.user.create({
        data: {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.full_name ?? session.user.email,
          role: Role.CASHIER, // ✅ safe default
        },
      });
      userFromDb = { role: Role.CASHIER };
      console.log(`[MIDDLEWARE] User ${session.user.id} created with role CASHIER.`);
    } catch (error) {
      console.error(`[MIDDLEWARE] Failed to create user`, error);
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/login?error=user-sync-failed', req.url));
    }
  } else {
    console.log(`[MIDDLEWARE] Found user ${session.user.id} with role ${userFromDb.role}`);
  }

  const userRole = userFromDb.role;
  const requiredRoles = accessRules.find(rule => pathname.startsWith(rule.path))?.roles;

  if (requiredRoles) {
    // ✅ Allow user to fetch their own profile
    if (
      pathname.startsWith('/api/users/') &&
      pathname.endsWith(session.user.id)
    ) {
      console.log(`[MIDDLEWARE] Allowing access to own profile for ${session.user.id}`);
      return res;
    }

    if (!requiredRoles.includes(userRole)) {
      console.warn(`[MIDDLEWARE] User ${session.user.id} lacks role ${userRole} for ${pathname}`);
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
