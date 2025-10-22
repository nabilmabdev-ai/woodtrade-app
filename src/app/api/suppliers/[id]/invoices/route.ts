// src/app/api/suppliers/[id]/invoices/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierInvoiceStatus, Prisma } from '@prisma/client';

/**
 * Gère la requête GET pour récupérer les factures d'un fournisseur.
 *
 * ✅ CORRECTION DE COHÉRENCE :
 * Assure que le nom du champ de date retourné (`invoiceDate`) correspond exactement
 * au nom dans le schéma de la base de données et à ce que le front-end attend.
 * Cela évite que des données valides n'apparaissent pas dans l'interface utilisateur.
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

      // --- ✅ FIX APPLIED HERE ---
      // The field name 'invoiceDate' now correctly matches the Prisma schema and frontend expectations.
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        invoiceDate: invoice.invoiceDate, // ✅ Corrigé de 'issueDate' à 'invoiceDate'
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