// src/app/api/orders/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const order = await prisma.customerOrder.findUnique({
      where: {
        id: id,
      },
      include: {
        company: true,
        contact: true,
        user: true,
        lines: {
          include: {
            productVariant: {
              include: {
                product: true,
              }
            }
          }
        }
      },
    });

    if (!order) {
      return new NextResponse(
        JSON.stringify({ error: 'Commande non trouvée' }),
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer la commande', details: errorMessage }),
      { status: 500 }
    );
  }
}