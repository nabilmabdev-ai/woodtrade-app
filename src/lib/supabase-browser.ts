// src/lib/supabase-browser.ts
"use client";

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

// ✅ CORRECTION: Define a minimal placeholder type for the database schema.
// This avoids using 'any' and satisfies the ESLint rule.
export type Database = {
  public: {
    Tables: {
      // You can expand this later with your actual tables if you want full type safety
    };
    Enums: {
      // You can expand this with your actual enums
    };
    Functions: {
      // You can expand this with your actual functions
    };
  };
};

// Use the new Database type for the singleton instance.
let supabase: SupabaseClient<Database> | undefined;

/**
 * Gets the singleton instance of the Supabase browser client.
 * This function ensures the client is created only when first needed,
 * avoiding issues during server-side prerendering.
 */
export const getSupabase = (): SupabaseClient<Database> => {
  if (!supabase) {
    // Pass the Database type as a generic to the client creation function.
    supabase = createClientComponentClient<Database>();
  }
  return supabase;
};