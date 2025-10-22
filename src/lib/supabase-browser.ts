"use client";

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Define your Supabase Database schema.
 * Fill in your actual tables, enums, and functions for full type safety.
 */
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          created_at: string;
        };
        Insert: {
          email: string;
          name?: string | null;
        };
        Update: {
          email?: string;
          name?: string | null;
        };
      };
      posts: {
        Row: {
          id: string;
          title: string;
          content: string;
          author_id: string;
          created_at: string;
        };
        Insert: {
          title: string;
          content: string;
          author_id: string;
        };
        Update: {
          title?: string;
          content?: string;
        };
      };
      // Add more tables here
    };
    Enums: {
      role: 'user' | 'admin';
      // Add more enums here
    };
    Functions: {
      get_user_posts: {
        Args: { user_id: string };
        Returns: {
          id: string;
          title: string;
          content: string;
        }[];
      };
      // Add more stored functions here
    };
  };
};

// Singleton Supabase client
let supabase: SupabaseClient<Database> | undefined;

/**
 * Returns the singleton Supabase browser client.
 * Ensures the client is initialized only once.
 */
export const getSupabase = (): SupabaseClient<Database> => {
  if (!supabase) {
    supabase = createClientComponentClient<Database>();
  }
  return supabase;
};
