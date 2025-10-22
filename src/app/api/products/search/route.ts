// src/app/api/products/search/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Gère la recherche de produits en fonction d'un terme de recherche (query).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    // Si aucune recherche n'est fournie, on renvoie un tableau vide.
    return NextResponse.json([]);
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        // La recherche se fait sur plusieurs champs :
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive', // Ignore la différence entre majuscules et minuscules
            },
          },
          {
            sku: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      // On inclut les variantes et les prix pour les afficher dans le POS
      include: {
        variants: {
          include: {
            prices: {
              // On ne prend que le prix de détail pour le moment
              where: { priceType: 'retail' },
            },
          },
        },
      },
      take: 20, // On limite le nombre de résultats pour la performance
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Erreur lors de la recherche de produits:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Erreur serveur lors de la recherche' }),
      { status: 500 }
    );
  }
}