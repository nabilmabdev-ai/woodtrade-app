// src/lib/supabase-browser.ts
"use client";

// CORRECTION : On importe `createClientComponentClient` au lieu de `createBrowserClient`
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Le reste du fichier n'a pas besoin de vos clés en dur, car la bibliothèque
// les lira automatiquement depuis vos variables d'environnement `NEXT_PUBLIC_...`
// C'est une meilleure pratique.

// CORRECTION : On appelle la nouvelle fonction. Elle n'a pas besoin d'arguments ici.
export const supabase = createClientComponentClient();