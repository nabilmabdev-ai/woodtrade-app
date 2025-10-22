// src/app/api/suppliers/[id]/invoices/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierInvoiceStatus, Prisma } from '@prisma/client';

/**
 * Gère la requête GET pour récupérer les factures d'un fournisseur.
 * CORRIGÉ : Assure la cohérence des noms de champs entre la DB et la réponse API.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplierId } = await context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    if (!supplierId) {
      return new NextResponse(JSON.stringify({ error: "L'ID du fournisseur est manquant." }), { status: 400 });
    }

    const whereClause: Prisma.SupplierInvoiceWhereInput = {
      supplierId: supplierId,
    };

    if (status === 'unpaid') {
      whereClause.status = {
        in: [SupplierInvoiceStatus.UNPAID, SupplierInvoiceStatus.PARTIALLY_PAID],
      };
    } else {
      whereClause.status = {
        not: SupplierInvoiceStatus.DRAFT
      };
    }

    const invoices = await prisma.supplierInvoice.findMany({
      where: whereClause,
      include: {
        allocations: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
    
    const invoicesWithBalance = invoices.map(invoice => {
      const totalAllocated = invoice.allocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
      const remainingDue = invoice.total - totalAllocated;

      // --- CORRECTION APPLIQUÉE ICI ---
      // Le champ dans la base de données est 'invoiceDate'. L'API retourne maintenant ce nom.
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        invoiceDate: invoice.invoiceDate, // ✅ Corrigé
        dueDate: invoice.dueDate,
        total: invoice.total,
        remainingDue: remainingDue,
      };
    });

    return NextResponse.json(invoicesWithBalance);

  } catch (error) {
    const idFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la récupération des factures pour le fournisseur ${idFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les factures', details: errorMessage }),
      { status: 500 }
    );
  }
}