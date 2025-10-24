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

  console.log(`[MIDDLEWARE] Path: ${pathname} | Session: ${session ? 'YES' : 'NO'}`)

  // If user is not signed in and the current path is not the login page, redirect the user to the login page
  if (!session && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // If user is signed in and the current path is the login page, redirect the user to the home page
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}```

</details>

### 2. Updated Authorization Helper

The `src/lib/authorize.ts` helper, used by API routes for RBAC, is now updated to correctly retrieve the user session on the server. This fixes the authentication issue for all routes that use this function.

<details>
<summary>src/lib/authorize.ts</summary>

```typescript
import { Role, User } from '@prisma/client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { logRbacViolation } from './rbac-logger';
import { Database } from './supabase-browser';

export async function authorize(allowedRoles: Role[], action: string): Promise<User> {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('UNAUTHORIZED');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  if (!allowedRoles.includes(user.role)) {
    logRbacViolation(user.id, action);
    throw new Error('FORBIDDEN');
  }

  return user;
}