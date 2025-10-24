// src/app/api/test-db/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Ce test n'utilise PAS les helpers de Next.js, mais une connexion directe
    // avec la clé de service, qui a tous les droits.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
        throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE is not defined in environment variables.");
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    );

    console.log("Tentative de connexion avec la clé de service...");
    const { data, error, count } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Erreur de Supabase (service_role): ${error.message}`);
    }

    console.log(`Connexion réussie avec la clé de service ! Nombre d'utilisateurs: ${count}`);
    return NextResponse.json({
      success: true,
      message: `Connexion serveur-à-serveur réussie. ${count} utilisateurs trouvés.`,
    });

  } catch (error) {
    console.error("!!! ÉCHEC DE LA CONNEXION SERVEUR-À-SERVEUR !!!");
    console.error(error); 
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue.";
    return new NextResponse(JSON.stringify({ success: false, message: "Échec de la connexion.", error: errorMessage }), { status: 500 });
  }
}