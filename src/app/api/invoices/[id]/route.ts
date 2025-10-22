// src/app/api/invoices/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            company: true,
            contact: true,
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
        },
        payments: true,
      },
    });

    if (!invoice) {
      return new NextResponse(JSON.stringify({ error: 'Facture non trouvée' }), { status: 404 });
    }

    return NextResponse.json(invoice);

  } catch (error) {
    const idFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la récupération de la facture ${idFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(JSON.stringify({ error: 'Impossible de récupérer la facture', details: errorMessage }), { status: 500 });
  }
}