// src/app/api/customers/search/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Gère la recherche de clients (entreprises) en fonction d'un terme de recherche.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json([]);
  }

  try {
    const companies = await prisma.company.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive', // Ignore la casse
        },
      },
      // On inclut les contacts pour pouvoir en sélectionner un par défaut lors de la vente
      include: {
        contacts: {
          take: 1, // On a juste besoin d'un contact valide
        },
      },
      take: 10, // On limite le nombre de résultats
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error('Erreur lors de la recherche de clients:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Erreur serveur lors de la recherche' }),
      { status: 500 }
    );
  }
}