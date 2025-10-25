// lib/supabase-browser.ts
"use client";

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabase-types'; // <-- CORRECT: Import the shared type

// Singleton Supabase client
let supabase: SupabaseClient<Database> | undefined;

/**
 * Returns the singleton Supabase browser client.
 * Ensures the client is initialized only once.
 */
export const getSupabase = (): SupabaseClient<Database> => {
  if (!supabase) {
    supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabase;
};