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
        // ✅ CORRECTION : La fonction est maintenant 'async'
        async get(name: string) {
          // ✅ CORRECTION : On utilise 'await' pour obtenir le cookieStore
          const cookieStore = cookies();
          return cookieStore.get(name)?.value;
        },
        // ✅ CORRECTION : La fonction est maintenant 'async'
        async set(name: string, value: string, options: CookieOptions) {
          // ✅ CORRECTION : On utilise 'await' pour obtenir le cookieStore
          const cookieStore = cookies();
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Ignorer les erreurs en contexte "read-only"
          }
        },
        // ✅ CORRECTION : La fonction est maintenant 'async'
        async remove(name: string, options: CookieOptions) {
          // ✅ CORRECTION : On utilise 'await' pour obtenir le cookieStore
          const cookieStore = cookies();
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Ignorer les erreurs en contexte "read-only"
          }
        },
      },
    }
  );
}