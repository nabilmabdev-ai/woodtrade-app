
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Role } from '@prisma/client';
import { backendPermissionsMap } from '@/lib/permissions-map';
import { authorize } from '@/lib/authorize';

// Define the roles that are allowed to access this endpoint.
const ALLOWED_ROLES = backendPermissionsMap['/users']['GET'];

/**
 * Gère la requête GET pour récupérer tous les utilisateurs.
 *
 * ✅ SÉCURITÉ APPLIQUÉE : Cette route est maintenant protégée. Seuls les utilisateurs
 * avec un rôle `ADMIN` ou `SUPER_ADMIN` peuvent récupérer la liste complète.
 */
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    await authorize(ALLOWED_ROLES, 'GET /users');

    // 4. Si l'utilisateur est autorisé, procéder à la récupération des données.
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
      JSON.stringify({ error: "Une erreur interne est survenue lors de la récupération des utilisateurs." }),
      { status: 500 }
    );
  }
}
