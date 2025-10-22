// src/app/api/users/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Gère la requête GET pour récupérer tous les utilisateurs.
 * Plus tard, nous sécuriserons cette route pour qu'elle ne soit accessible qu'aux admins.
 */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      // On trie par date de création pour voir les plus récents en premier
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les utilisateurs' }),
      { status: 500 }
    );
  }
}