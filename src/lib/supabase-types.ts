// src/lib/supabase-types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: Record<string, never> // Changed from {}
    Enums: Record<string, never>  // Changed from {}
    Functions: Record<string, never> // Changed from {}
  }
}