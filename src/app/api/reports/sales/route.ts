// src/app/api/reports/sales/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const customerId = searchParams.get('customerId');

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'Les paramètres startDate et endDate sont requis.' },
      { status: 400 }
    );
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const orderFilter: Prisma.CustomerOrderWhereInput = {
      createdAt: {
        gte: start,
        lte: end,
      },
      ...(customerId && { companyId: customerId }),
    };

    const orderLines = await prisma.orderLine.findMany({
      where: {
        order: orderFilter,
      },
      include: {
        order: true,
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

    const productSummary = new Map<
      string,
      {
        productName: string;
        sku: string;
        quantitySold: number;
        totalRevenue: number;
      }
    >();

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

    const detailedReport = Array.from(productSummary.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    );

    const totalRevenue = detailedReport.reduce(
      (sum, p) => sum + p.totalRevenue,
      0
    );
    const totalItemsSold = detailedReport.reduce(
      (sum, p) => sum + p.quantitySold,
      0
    );

    const summary = {
      totalRevenue,
      totalItemsSold,
      numberOfOrders: uniqueOrderIds.size,
      averageOrderValue:
        uniqueOrderIds.size > 0 ? totalRevenue / uniqueOrderIds.size : 0,
    };

    return NextResponse.json({
      summary,
      detailedReport,
    });
  } catch (error) {
    console.error('Erreur lors de la génération du rapport des ventes:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erreur interne.';
    return NextResponse.json(
      {
        error: 'Impossible de générer le rapport.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}