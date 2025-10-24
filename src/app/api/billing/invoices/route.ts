// src/app/api/billing/invoices/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/authorize';
import { backendPermissionsMap } from '@/lib/permissions-map';
import { InvoiceStatus } from '@prisma/client';

const ALLOWED_ROLES = backendPermissionsMap['/billing/invoices']['POST'];

/**
 * Gère la requête POST pour créer une nouvelle commande et sa facture associée.
 * This has been corrected to follow the schema: Invoice -> CustomerOrder -> Company.
 */
export async function POST(request: Request) {
  try {
    const user = await authorize(ALLOWED_ROLES, 'POST /billing/invoices');

    const body = await request.json();
    const { companyId, dueDate, items } = body as {
      companyId: string;
      dueDate: string;
      items: { productVariantId: string; quantity: number; unitPrice: number }[];
    };

    if (!companyId || !dueDate || !items || items.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'Données de la facture incomplètes ou invalides.' }),
        { status: 400 }
      );
    }

    const newInvoice = await prisma.$transaction(async (tx) => {
      // 1. Find a default contact for the company.
      const contact = await tx.contact.findFirst({
        where: { companyId: companyId },
      });

      if (!contact) {
        throw new Error(`Aucun contact trouvé pour l'entreprise avec l'ID: ${companyId}`);
      }
      
      // 2. Calculate totals from the line items.
      const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
      // For now, no global discount is applied here.
      const grandTotal = subtotal;

      // 3. Create the CustomerOrder record.
      const newOrder = await tx.customerOrder.create({
        data: {
          companyId: companyId,
          contactId: contact.id,
          userId: user.id,
          subtotal: subtotal,
          grandTotal: grandTotal,
          status: 'DELIVERED', // Assume the order is fulfilled as it's being invoiced.
          lines: {
            create: items.map(item => ({
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
        },
      });

      // 4. Create the Invoice linked to the new order.
      const invoice = await tx.invoice.create({
        data: {
          orderId: newOrder.id,
          status: InvoiceStatus.UNPAID,
          subtotal: subtotal,
          total: grandTotal,
          dueDate: new Date(dueDate),
        },
      });

      return invoice;
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