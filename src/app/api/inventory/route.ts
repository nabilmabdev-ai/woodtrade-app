// src/app/api/inventory/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Gère la requête GET pour récupérer l'état actuel de tout l'inventaire.
 */
export async function GET() {
  try {
    const inventoryState = await prisma.inventory.findMany({
      // Nous incluons les informations du produit pour chaque ligne de stock
      // afin de pouvoir afficher des détails utiles comme le nom du produit.
      include: {
        productVariant: {
          include: {
            product: {
              select: {
                name: true,
                sku: true,
              },
            },
          },
        },
      },
      orderBy: {
        productVariant: {
          product: {
            name: 'asc',
          },
        },
      },
    });

    return NextResponse.json(inventoryState);

  } catch (error) {
    console.error("Erreur lors de la récupération de l'inventaire:", error);
    return new NextResponse(
      JSON.stringify({ error: "Impossible de récupérer les données d'inventaire" }),
      { status: 500 }
    );
  }
}