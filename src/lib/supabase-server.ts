// src/lib/supabase-server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from './supabase-types';

export function createSupabaseServerClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // La fonction 'get' DOIT être déclarée comme 'async'.
        async get(name: string) {
          // ✅ LA CORRECTION DÉFINITIVE EST ICI :
          // Le mot-clé 'await' est essentiel pour attendre que la fonction 'cookies()'
          // retourne l'objet contenant les cookies.
          const cookieStore = await cookies(); 
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        async remove(name: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value: '', ...options });
          } catch {}
        },
      },
    }
  );
}