// src/lib/supabase-server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from './supabase-browser';

export function createSupabaseServerClient() {
  // Récupération du cookie store depuis next/headers
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // La fonction `get` lit un cookie à partir de la requête entrante.
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // La fonction `set` écrit un cookie sur la réponse sortante.
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Cette fonction peut être appelée dans des contextes "read-only" (lecture seule)
            // où la modification des cookies n'est pas possible. On ignore l'erreur dans ce cas.
          }
        },
        // La fonction `remove` supprime un cookie sur la réponse sortante.
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Comme pour `set`, on ignore les erreurs en contexte "read-only".
          }
        },
      },
    }
  );
}