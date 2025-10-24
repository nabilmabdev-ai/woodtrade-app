// lib/supabase-types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      // Your tables will go here, but an empty placeholder is fine for now.
    }
    Enums: {
      // Your enums will go here.
    }
    Functions: {
      // Your functions will go here.
    }
  }
}