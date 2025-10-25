// src/app/api/auth/check-session/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = "nodejs";

export async function GET() {
  console.log('--- DIAGNOSTIC CHECK (v2) ---');
  console.log('SERVER SAW URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('SERVER SAW ANON KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  console.log('---------------------------');

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        // This is the complete, correct cookie handler object.
        cookies: {
          async get(name: string) {
            const cookieStore = await cookies();
            return cookieStore.get(name)?.value
          },
          async set(name: string, value: string, options: CookieOptions) {
            try {
              const cookieStore = await cookies();
              cookieStore.set({ name, value, ...options })
            } catch {
              // Errors are ignored in read-only environments.
            }
          },
          async remove(name: string, options: CookieOptions) {
            try {
              const cookieStore = await cookies();
              cookieStore.set({ name, value: '', ...options })
            } catch {
              // Errors are ignored in read-only environments.
            }
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      return NextResponse.json({ status: 'SUCCESS: Session Found!', user_email: session.user.email });
    }

    // If we reach here, it means the .env variables are likely missing on the server.
    return NextResponse.json({ status: 'FAILURE: No Session Found' }, { status: 401 });

  } catch {
      return NextResponse.json({ status: 'CRITICAL ERROR IN ROUTE', message: "An unknown error occurred." }, { status: 500 });
  }
}