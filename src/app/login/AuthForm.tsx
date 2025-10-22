// src/app/login/AuthForm.tsx
"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { getSupabase } from '@/lib/supabase-browser';

// This component solely wraps the Supabase Auth UI.
export default function AuthForm() {
  const supabase = getSupabase();

  return (
    <Auth
      supabaseClient={supabase}
      appearance={{ theme: ThemeSupa }}
      providers={['google', 'github']}
    />
  );
}