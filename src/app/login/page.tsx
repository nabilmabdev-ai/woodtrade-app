// src/app/login/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase-browser';
import dynamic from 'next/dynamic';

// ✅ CORRECTION: Dynamically import the AuthForm with SSR turned off.
// This is the key to preventing the server-side rendering error during build.
const AuthForm = dynamic(() => import('./AuthForm'), {
  ssr: false,
  loading: () => <p className="text-center text-gray-500">Loading login form...</p>,
});

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // This effect still handles redirecting the user after a successful login.
    const supabase = getSupabase();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[LOGIN PAGE] Auth event: ${event}, Session=${session ? "YES" : "NO"}`);
      if (event === 'SIGNED_IN' && session) {
        console.log("[LOGIN PAGE] Signed in → replacing with /");
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
        
        {/* Render the dynamically loaded component */}
        <AuthForm />
      </div>
    </div>
  );
}