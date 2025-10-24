
// src/app/api/dashboard/stats/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Gère la requête GET pour récupérer les statistiques aggrégées pour le tableau de bord.
 */
export async function GET() {
  try {
    // --- 1. Calculer les statistiques de ventes (7 derniers jours) ---
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const salesStats = await prisma.invoice.aggregate({
      where: {
        issueDate: {
          gte: sevenDaysAgo, // gte = greater than or equal to
        },
        status: 'PAID', // On ne compte que les factures payées
      },
      _sum: {
        total: true, // Somme du chiffre d'affaires
      },
      _count: {
        id: true, // Nombre de factures (ventes)
      },
    });

    // --- 2. Récupérer les produits en stock bas (moins de 10 unités) ---
    const lowStockThreshold = 10;
    const lowStockProducts = await prisma.inventory.findMany({
      where: {
        quantity: {
          lt: lowStockThreshold, // lt = less than
        },
      },
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        quantity: 'asc', // Les plus bas en premier
      },
      take: 5, // On n'affiche que les 5 plus critiques
    });

    // --- 3. Récupérer les produits les plus vendus (Top 5) ---
    const topSellingProducts = await prisma.orderLine.groupBy({
      by: ['productVariantId'],
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    // On doit faire une deuxième requête pour obtenir les noms des produits
    const topProductsDetails = await prisma.productVariant.findMany({
        where: {
            id: {
                in: topSellingProducts.map(p => p.productVariantId)
            }
        },
        include: {
            product: true
        }
    });

    // On fusionne les résultats des deux requêtes
    const topProductsWithNames = topSellingProducts.map(p => {
        const details = topProductsDetails.find(d => d.id === p.productVariantId);
        return {
            name: details?.product.name || 'Produit inconnu',
            totalSold: p._sum.quantity,
        }
    });


    // --- On combine tout dans une seule réponse ---
    const response = {
      salesLast7Days: {
        revenue: salesStats._sum.total || 0,
        count: salesStats._count.id || 0,
      },
      lowStockProducts,
      topSellingProducts: topProductsWithNames,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Erreur lors de la récupération des stats du dashboard:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de charger les statistiques' }),
      { status: 500 }
    );
  }
}
