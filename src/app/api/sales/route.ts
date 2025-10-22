// --- Content from: src/app/api/reports/sales/route.ts ---

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Les paramètres startDate et endDate sont requis.' }, { status: 400 });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    // Set the time to the end of the selected day to include all transactions on that day.
    end.setHours(23, 59, 59, 999);

    // 1. Fetch all order lines within the specified date range.
    // We filter by the creation date of the parent order.
    const orderLines = await prisma.orderLine.findMany({
      where: {
        order: {
          createdAt: {
            gte: start,
            lte: end,
          },
          // Optionally, you might want to only include completed orders.
          // For now, we include all orders created in the period.
          // status: { in: ['PAID', 'DELIVERED'] } 
        },
      },
      include: {
        order: true, // Needed to get the order ID for counting unique orders
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
    });

    // 2. Process the data to create the report.
    const productSummary = new Map<string, {
        productName: string;
        sku: string;
        quantitySold: number;
        totalRevenue: number;
    }>();

    const uniqueOrderIds = new Set<string>();

    for (const line of orderLines) {
        uniqueOrderIds.add(line.orderId);

        const { productVariant } = line;
        const productId = productVariant.id;
        const existing = productSummary.get(productId);

        if (existing) {
            existing.quantitySold += line.quantity;
            existing.totalRevenue += line.totalPrice;
        } else {
            productSummary.set(productId, {
                productName: productVariant.product.name,
                sku: productVariant.product.sku,
                quantitySold: line.quantity,
                totalRevenue: line.totalPrice,
            });
        }
    }

    // Convert the map to an array and sort by revenue.
    const detailedReport = Array.from(productSummary.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    );

    // 3. Calculate overall summary statistics.
    const totalRevenue = detailedReport.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalItemsSold = detailedReport.reduce((sum, p) => sum + p.quantitySold, 0);
    
    const summary = {
      totalRevenue,
      totalItemsSold,
      numberOfOrders: uniqueOrderIds.size,
      averageOrderValue: uniqueOrderIds.size > 0 ? totalRevenue / uniqueOrderIds.size : 0,
    };

    return NextResponse.json({
      summary,
      detailedReport,
    });

  } catch (error) {
    console.error("Erreur lors de la génération du rapport des ventes:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return NextResponse.json({ error: "Impossible de générer le rapport.", details: errorMessage }, { status: 500 });
  }
}