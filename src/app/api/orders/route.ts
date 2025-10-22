// src/app/api/orders/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface OrderLineData {
  productVariantId: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Gère la requête GET pour récupérer toutes les commandes.
 */
export async function GET() {
  try {
    const orders = await prisma.customerOrder.findMany({
      include: {
        company: {
          select: {
            name: true,
          },
        },
        lines: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les commandes', details: errorMessage }),
      { status: 500 }
    );
  }
}

/**
 * Gère la requête POST pour créer une nouvelle commande.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyId, contactId, userId, lines } = body;

    if (!companyId || !contactId || !userId || !lines || lines.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'Données de commande incomplètes' }),
        { status: 400 }
      );
    }

    // --- Calcul des totaux (CORRIGÉ) ---
    const subtotal = lines.reduce((acc: number, line: OrderLineData) => {
      return acc + line.quantity * line.unitPrice;
    }, 0);
    // Pour cette route simple, il n'y a pas de remise, donc grandTotal est égal à subtotal.
    const grandTotal = subtotal;

    // --- Création de la commande (CORRIGÉ) ---
    const newOrder = await prisma.customerOrder.create({
      data: {
        companyId,
        contactId,
        userId,
        subtotal,   // Utilise 'subtotal'
        grandTotal, // Utilise 'grandTotal'
        // 'discount' a une valeur par défaut de 0 dans le schéma, donc pas besoin de le spécifier
        status: 'PENDING',
        lines: {
          create: lines.map((line: OrderLineData) => ({
            productVariantId: line.productVariantId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            totalPrice: line.quantity * line.unitPrice,
          })),
        },
      },
      include: {
        lines: true,
      },
    });

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de la commande:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de créer la commande', details: errorMessage }),
      { status: 500 }
    );
  }
}