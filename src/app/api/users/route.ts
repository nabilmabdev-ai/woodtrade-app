// src/app/api/users/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { backendPermissionsMap } from '@/lib/permissions-map';
import { authorize } from '@/lib/authorize';

// ✅ LA CORRECTION CLÉ EST ICI :
// Cette ligne force la route à s'exécuter dans l'environnement Node.js.
// Sans cela, elle pourrait s'exécuter dans un environnement "Edge" où l'accès
// aux cookies via `next/headers` (utilisé par notre client Supabase) n'est pas garanti.
export const runtime = "nodejs";

const ALLOWED_ROLES = backendPermissionsMap['/users']['GET'];

export async function GET() {
  console.log("[API /users] Requête GET reçue."); 
  
  try {
    // La fonction authorize() devrait maintenant réussir grâce aux deux corrections.
    await authorize(ALLOWED_ROLES, 'GET /users');

    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(users);

  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return new NextResponse(error.message, { status: error.message === 'UNAUTHORIZED' ? 401 : 403 });
    }
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return new NextResponse(
      JSON.stringify({ error: "Une erreur interne est survenue." }),
      { status: 500 }
    );
  }
}