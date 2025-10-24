// src/app/api/orders/search/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Gère la recherche de commandes éligibles pour un retour.
 * Pour être éligible, une commande doit avoir le statut "DELIVERED".
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query || query.length < 4) {
    // On ne lance la recherche que si l'utilisateur a tapé plusieurs caractères
    // pour éviter de surcharger la base de données.
    return NextResponse.json([]);
  }

  try {
    const orders = await prisma.customerOrder.findMany({
      where: {
        // On cherche une correspondance partielle et insensible à la casse dans l'ID de la commande
        id: {
          contains: query,
          mode: 'insensitive',
        },
        // Condition cruciale : seules les commandes déjà livrées peuvent être retournées.
        status: 'DELIVERED', 
      },
      // On inclut toutes les données nécessaires pour que l'interface puisse
      // afficher les détails de la commande et de ses articles.
      include: {
        company: true,
        lines: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      take: 10, // On limite le nombre de résultats pour de meilleures performances.
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Erreur lors de la recherche de commande pour retour:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Erreur serveur lors de la recherche' }),
      { status: 500 }
    );
  }
}
