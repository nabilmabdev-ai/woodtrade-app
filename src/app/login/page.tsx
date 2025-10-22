// src/app/login/page.tsx
"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { getSupabase } from '@/lib/supabase-browser'; // ✅ CORRECTION: Import getSupabase function
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  
  // ✅ CORRECTION: Get the Supabase client instance by calling the function
  const supabase = getSupabase();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[LOGIN PAGE] Auth event: ${event}, Session=${session ? "YES" : "NO"}`);
      if (event === 'SIGNED_IN' && session) {
        console.log("[LOGIN PAGE] Signed in → pushing to /");
        // Use router.replace to avoid adding a new entry to the history stack
        router.replace('/'); 
      }
      if (event === 'SIGNED_OUT') {
        console.log("[LOGIN PAGE] Signed out");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">WoodTrade Login</h1>
        
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google', 'github']}
        />
      </div>
    </div>
  );
}