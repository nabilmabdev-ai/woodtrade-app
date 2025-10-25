// src/app/api/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'; // <-- CORRECT IMPORT
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            const cookieStore = await cookies();
            return cookieStore.get(name)?.value
          },
          async set(name: string, value: string, options: CookieOptions) {
            try {
              const cookieStore = await cookies();
              cookieStore.set({ name, value, ...options })
            } catch {}
          },
          async remove(name: string, options: CookieOptions) {
            try {
              const cookieStore = await cookies();
              cookieStore.set({ name, value: '', ...options })
            } catch {}
          },
        },
      }
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin);
}