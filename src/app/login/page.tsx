// src/app/login/page.tsx
"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { getSupabase } from '@/lib/supabase-browser';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  
  // ✅ CORRECTION: The Supabase client is now retrieved inside the useEffect hook
  // to ensure it only runs on the client-side after mounting.
  let supabase: SupabaseClient<Database>;

  useEffect(() => {
    supabase = getSupabase();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[LOGIN PAGE] Auth event: ${event}, Session=${session ? "YES" : "NO"}`);
      if (event === 'SIGNED_IN' && session) {
        console.log("[LOGIN PAGE] Signed in → pushing to /");
        router.replace('/'); 
      }
      if (event === 'SIGNED_OUT') {
        console.log("[LOGIN PAGE] Signed out");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">WoodTrade Login</h1>
        
        <Auth
          supabaseClient={getSupabase()} // Call getSupabase directly here as Auth component expects it.
          appearance={{ theme: ThemeSupa }}
          providers={['google', 'github']}
        />
      </div>
    </div>
  );
}