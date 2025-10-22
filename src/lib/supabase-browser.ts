// src/lib/supabase-browser.ts
"use client";

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

// ✅ CORRECTION: Use a more generic type to match the output of the create function
let supabase: SupabaseClient<any> | undefined;

/**
 * Gets the singleton instance of the Supabase browser client.
 * This function ensures the client is created only when first needed,
 * avoiding issues during server-side prerendering.
 */
// ✅ CORRECTION: Explicitly set the return type to the same generic SupabaseClient
export const getSupabase = (): SupabaseClient<any> => {
  if (!supabase) {
    // The function returns a generic client, so our types must match.
    supabase = createClientComponentClient();
  }
  return supabase;
};