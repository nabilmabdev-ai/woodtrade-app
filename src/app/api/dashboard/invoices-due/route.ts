// src/app/api/dashboard/invoices-due/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierInvoiceStatus } from '@prisma/client';

/**
 * Gère la requête GET pour récupérer les 5 prochaines factures fournisseurs
 * impayées ou partiellement payées, triées par date d'échéance.
 */
export async function GET() {
  try {
    const invoicesDue = await prisma.supplierInvoice.findMany({
      where: {
        status: {
          in: [SupplierInvoiceStatus.UNPAID, SupplierInvoiceStatus.PARTIALLY_PAID],
        },
      },
      // Trier par la date d'échéance la plus proche
      orderBy: {
        dueDate: 'asc',
      },
      // Limiter aux 5 plus urgentes
      take: 5,
      include: {
        // Inclure le nom du fournisseur pour l'affichage
        supplier: {
          select: {
            name: true,
          },
        },
        // Inclure les allocations pour calculer le solde restant
        allocations: true,
      },
    });

    // Calculer le solde restant pour chaque facture
    const invoicesWithBalance = invoicesDue.map(invoice => {
        const totalAllocated = invoice.allocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
        const remainingDue = invoice.total - totalAllocated;
        return {
            id: invoice.id,
            supplierName: invoice.supplier.name,
            dueDate: invoice.dueDate,
            remainingDue: remainingDue,
        }
    });

    return NextResponse.json(invoicesWithBalance);

  } catch (error) {
    console.error('Erreur lors de la récupération des factures à échéance:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de charger les factures à échéance', details: errorMessage }),
      { status: 500 }
    );
  }
}