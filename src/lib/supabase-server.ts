// src/lib/supabase-server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from './supabase-browser';

export function createSupabaseServerClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // The `get` function is now `async`
        async get(name: string) {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
        // The `set` function is now `async`
        async set(name: string, value: string, options: CookieOptions) {
          const cookieStore = await cookies();
          cookieStore.set({ name, value, ...options });
        },
        // The `remove` function is now `async`
        async remove(name: string, options: CookieOptions) {
          const cookieStore = await cookies();
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}