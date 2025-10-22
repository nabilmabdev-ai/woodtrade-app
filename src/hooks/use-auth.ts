// src/hooks/use-auth.ts
"use client";

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase-browser'; // ✅ CORRECTION: Import getSupabase function
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { Role } from '@prisma/client';

export interface AppUser extends SupabaseUser {
  role: Role;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ CORRECTION: Get the Supabase client instance by calling the function
    const supabase = getSupabase();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log(`[USE_AUTH] Event=${event}, Session=${currentSession ? "YES" : "NO"}`);
        
        if (currentSession) {
          setSession(currentSession);
          try {
            console.log(`[USE_AUTH] Fetching profile for user ${currentSession.user.id}`);
            const profileRes = await fetch(`/api/users/${currentSession.user.id}`);
            console.log(`[USE_AUTH] Profile fetch status: ${profileRes.status}`);
            
            if (profileRes.ok) {
              const profile = await profileRes.json();
              const appUser: AppUser = { ...currentSession.user, role: profile.role };
              console.log(`[USE_AUTH] Profile loaded with role ${profile.role}`);
              setUser(appUser);
            } else {
              console.warn("[USE_AUTH] Profile not found or unauthorized → resetting user");
              setUser(null);
            }
          } catch (error) {
            console.error("[USE_AUTH] Error fetching profile:", error);
            setUser(null);
          }
        } else {
          console.log("[USE_AUTH] No session → clearing state");
          setSession(null);
          setUser(null);
        }

        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}