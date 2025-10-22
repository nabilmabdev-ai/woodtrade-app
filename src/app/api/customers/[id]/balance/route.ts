// src/app/api/customers/[id]/balance/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreditNoteStatus, InvoiceStatus } from '@prisma/client';

/**
 * Gère la requête GET pour calculer et retourner le solde financier
 * et les statistiques clés pour un client spécifique.
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

    // 1. Calculer le total de toutes les factures (ce que le client a été facturé)
    const totalInvoiced = await prisma.invoice.aggregate({
      where: { 
        order: { companyId: companyId },
        status: { notIn: [InvoiceStatus.VOID, InvoiceStatus.DRAFT] } // On exclut les factures annulées/brouillons
      },
      _sum: {
        total: true,
      },
    });

    // 2. Calculer le total de tous les paiements (ce que le client a payé)
    const totalPaid = await prisma.payment.aggregate({
      where: { companyId: companyId },
      _sum: {
        amount: true,
      },
    });

    // 3. Calculer le total des avoirs utilisés (ce qui a été crédité sur des factures)
    const totalCreditUsed = await prisma.creditNoteAllocation.aggregate({
        where: { invoice: { order: { companyId: companyId } } },
        _sum: {
            amountAllocated: true,
        }
    });

    // 4. Calculer le total des avoirs encore disponibles
    const availableCredit = await prisma.creditNote.aggregate({
        where: { 
            companyId: companyId,
            status: { in: [CreditNoteStatus.AVAILABLE, CreditNoteStatus.PARTIALLY_USED] }
        },
        _sum: {
            remainingAmount: true,
        }
    });

    // 5. Compter les factures en retard
    const overdueInvoicesCount = await prisma.invoice.count({
        where: {
            order: { companyId: companyId },
            status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] },
            dueDate: { lt: new Date() } // lt = less than
        }
    });
    
    const invoicedAmount = totalInvoiced._sum.total || 0;
    const paidAmount = totalPaid._sum.amount || 0;
    const creditUsedAmount = totalCreditUsed._sum.amountAllocated || 0;

    // Le solde est ce qui a été facturé moins ce qui a été payé (par paiement direct ou par avoir)
    const balance = invoicedAmount - paidAmount - creditUsedAmount;
    
    const financialSummary = {
      balance: balance,
      availableCredit: availableCredit._sum.remainingAmount || 0,
      overdueInvoiceCount: overdueInvoicesCount,
    };

    return NextResponse.json(financialSummary);

  } catch (error) {
    const idFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors du calcul du solde pour le client ${idFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de calculer le solde', details: errorMessage }),
      { status: 500 }
    );
  }
}