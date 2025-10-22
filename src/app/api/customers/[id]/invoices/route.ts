// src/app/api/customers/[id]/invoices/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InvoiceStatus } from '@prisma/client';

/**
 * Gère la requête GET pour récupérer toutes les factures d'un client spécifique,
 * en y ajoutant le montant restant à payer calculé.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await context.params;

    if (!companyId) {
      return new NextResponse(JSON.stringify({ error: "L'ID du client est manquant." }), { status: 400 });
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        order: { companyId: companyId },
        status: { not: InvoiceStatus.DRAFT }
      },
      include: {
        paymentAllocations: true,
        creditNoteAllocations: true,
      },
      orderBy: {
        issueDate: 'desc',
      },
    });

    // Pour chaque facture, on calcule le solde restant et on l'ajoute à l'objet retourné.
    // C'est plus efficace de le faire ici sur le serveur que sur le client.
    const invoicesWithBalance = invoices.map(invoice => {
      const totalAllocated = 
        invoice.paymentAllocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0) +
        invoice.creditNoteAllocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
      
      const remainingDue = invoice.total - totalAllocated;

      return {
        id: invoice.id,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        total: invoice.total,
        remainingDue: remainingDue,
      };
    });

    return NextResponse.json(invoicesWithBalance);

  } catch (error) {
    const idFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la récupération des factures pour le client ${idFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les factures', details: errorMessage }),
      { status: 500 }
    );
  }
}