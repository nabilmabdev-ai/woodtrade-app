// src/app/api/suppliers/[id]/balance/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierInvoiceStatus } from '@prisma/client';

/**
 * Gère la requête GET pour calculer et retourner le solde financier
 * et les statistiques clés pour un fournisseur spécifique.
 * CORRECTIF : Le solde est maintenant calculé en se basant sur la somme des
 * allocations de paiement réelles, et non sur le montant brut des paiements.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplierId } = await context.params;

    if (!supplierId) {
      return new NextResponse(JSON.stringify({ error: "L'ID du fournisseur est manquant." }), { status: 400 });
    }

    // 1. Calculer le total de toutes les factures valides (ce que nous devons au fournisseur)
    const totalInvoicedResult = await prisma.supplierInvoice.aggregate({
      where: { 
        supplierId: supplierId,
        status: { notIn: [SupplierInvoiceStatus.VOID, SupplierInvoiceStatus.DRAFT] }
      },
      _sum: {
        total: true,
      },
    });
    const totalInvoiced = totalInvoicedResult._sum.total || 0;

    // 2. Calculer le total de tous les montants alloués aux factures de ce fournisseur.
    // C'est le montant réel que nous avons "utilisé" pour payer.
    const totalAllocatedResult = await prisma.supplierPaymentAllocation.aggregate({
        where: {
            invoice: {
                supplierId: supplierId,
            },
        },
        _sum: {
            amountAllocated: true,
        },
    });
    const totalAllocated = totalAllocatedResult._sum.amountAllocated || 0;

    // 3. Compter les factures en retard que nous n'avons pas encore entièrement payées
    const overdueInvoicesCount = await prisma.supplierInvoice.count({
        where: {
            supplierId: supplierId,
            status: { in: [SupplierInvoiceStatus.UNPAID, SupplierInvoiceStatus.PARTIALLY_PAID] },
            dueDate: { lt: new Date() } // lt = less than
        }
    });
    
    // Le solde précis est ce qui a été facturé moins ce qui a été alloué.
    const balance = totalInvoiced - totalAllocated;
    
    const financialSummary = {
      balance: balance, // Si > 0, nous devons de l'argent. Si < 0, nous avons un crédit.
      overdueInvoiceCount: overdueInvoicesCount,
      // On pourrait ajouter d'autres métriques si nécessaire pour l'affichage,
      // comme totalInvoiced ou totalAllocated.
    };

    return NextResponse.json(financialSummary);

  } catch (error) {
    const idFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors du calcul du solde pour le fournisseur ${idFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de calculer le solde', details: errorMessage }),
      { status: 500 }
    );
  }
}