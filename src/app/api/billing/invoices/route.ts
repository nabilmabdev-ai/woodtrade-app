// src/app/api/billing/invoices/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { authorize } from '@/lib/authorize';

/**
 * Gère la requête POST pour créer une nouvelle facture.
 */
export async function POST(request: Request) {
  try {
    const allowedRoles: Role[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'];
    await authorize(allowedRoles);

    const body = await request.json();
    const { companyId, amount, dueDate, items } = body as {
      companyId: string;
      amount: number;
      dueDate: string;
      items: { productId: string; quantity: number; unitPrice: number }[];
    };

    if (!companyId || !amount || amount <= 0 || !dueDate || !items || items.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'Données de la facture incomplètes ou invalides.' }),
        { status: 400 }
      );
    }

    const newInvoice = await prisma.invoice.create({
      data: {
        companyId,
        amount,
        dueDate: new Date(dueDate),
        status: 'PENDING',
        invoiceItems: {
          create: items,
        },
      },
    });

    return NextResponse.json(newInvoice, { status: 201 });

  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return new NextResponse(error.message, { status: error.message === 'UNAUTHORIZED' ? 401 : 403 });
    }
    console.error('Erreur lors de la création de la facture:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de créer la facture', details: errorMessage }),
      { status: 500 }
    );
  }
}
