// src/app/api/auth/check-session/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cookieStore = cookies();

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
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Errors are ignored in read-only environments.
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Errors are ignored in read-only environments.
            }
          },
        },
      }
    )

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json({ status: 'Supabase Error', message: error.message }, { status: 500 });
    }

    if (session) {
      return NextResponse.json({ status: 'SUCCESS: Session Found!', user_email: session.user.email });
    }

    // If we reach here, it means the .env variables are likely missing on the server.
    return NextResponse.json({ status: 'FAILURE: No Session Found' }, { status: 401 });

  } catch (e) {
      const err = e as Error;
      return NextResponse.json({ status: 'CRITICAL ERROR IN ROUTE', message: err.message }, { status: 500 });
  }
}