// src/lib/supabase-browser.ts
"use client";

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton instance to ensure the client is created only once.
let supabase: SupabaseClient | undefined;

/**
 * Gets the singleton instance of the Supabase browser client.
 * This function ensures the client is created only when first needed,
 * avoiding issues during server-side prerendering.
 */
// ✅ CORRECTION: Explicitly set the return type to SupabaseClient
export const getSupabase = (): SupabaseClient => {
  if (!supabase) {
    supabase = createClientComponentClient();
  }
  return supabase;
};