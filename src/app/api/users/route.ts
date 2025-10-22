// src/app/api/users/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Role } from '@prisma/client';

// Define the roles that are allowed to access this endpoint.
const ALLOWED_ROLES: Role[] = [Role.ADMIN, Role.SUPER_ADMIN];

/**
 * Gère la requête GET pour récupérer tous les utilisateurs.
 *
 * ✅ SÉCURITÉ APPLIQUÉE : Cette route est maintenant protégée. Seuls les utilisateurs
 * avec un rôle `ADMIN` ou `SUPER_ADMIN` peuvent récupérer la liste complète.
 */
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // 1. Vérifier la session de l'utilisateur qui fait la requête.
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse(
        JSON.stringify({ error: 'Non autorisé : aucune session trouvée.' }),
        { status: 401 }
      );
    }

    // 2. Récupérer le profil de l'utilisateur depuis notre base de données pour vérifier son rôle.
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'Non autorisé : utilisateur non trouvé dans la base de données.' }),
        { status: 403 }
      );
    }

    // 3. Appliquer la règle d'accès basée sur le rôle.
    if (!ALLOWED_ROLES.includes(user.role)) {
      return new NextResponse(
        JSON.stringify({ error: 'Accès refusé : permissions insuffisantes.' }),
        { status: 403 }
      );
    }

    // 4. Si l'utilisateur est autorisé, procéder à la récupération des données.
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(users);

  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return new NextResponse(
      JSON.stringify({ error: "Une erreur interne est survenue lors de la récupération des utilisateurs." }),
      { status: 500 }
    );
  }
}