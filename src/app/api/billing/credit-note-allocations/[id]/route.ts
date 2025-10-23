// src/app/api/billing/credit-note-allocations/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InvoiceStatus, CreditNoteStatus, Role } from '@prisma/client';
import { authorize } from '@/lib/authorize';

/**
 * Gère la requête DELETE pour supprimer une allocation d'avoir client.
 * Cela a pour effet de "détacher" un avoir d'une facture, rendant le montant
 * à nouveau disponible et mettant à jour les statuts.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const allowedRoles: Role[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'];
    await authorize(allowedRoles);

    const { id: allocationId } = await context.params;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Trouver l'allocation pour obtenir les IDs et le montant.
      const allocation = await tx.creditNoteAllocation.findUniqueOrThrow({
        where: { id: allocationId },
      });
      const { invoiceId, creditNoteId, amountAllocated } = allocation;

      // 2. Supprimer l'enregistrement d'allocation.
      await tx.creditNoteAllocation.delete({
        where: { id: allocationId },
      });

      // 3. Récupérer la facture et recalculer son statut.
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
        include: { paymentAllocations: true, creditNoteAllocations: true },
      });

      const totalAllocatedToInvoice =
        invoice.paymentAllocations.reduce((s, a) => s + a.amountAllocated, 0) +
        invoice.creditNoteAllocations.reduce((s, a) => s + a.amountAllocated, 0);

      let newInvoiceStatus: InvoiceStatus = InvoiceStatus.UNPAID;
      if (Math.abs(invoice.total - totalAllocatedToInvoice) < 0.01) {
        newInvoiceStatus = InvoiceStatus.PAID;
      } else if (totalAllocatedToInvoice > 0) {
        newInvoiceStatus = InvoiceStatus.PARTIALLY_PAID;
      }
      await tx.invoice.update({ where: { id: invoiceId }, data: { status: newInvoiceStatus } });

      // 4. Mettre à jour l'avoir en ré-incrémentant le montant disponible.
      const creditNote = await tx.creditNote.update({
        where: { id: creditNoteId },
        data: {
          remainingAmount: { increment: amountAllocated },
        },
      });
      
      // 5. Recalculer le statut de l'avoir.
      let newCreditNoteStatus: CreditNoteStatus = CreditNoteStatus.FULLY_USED;
      // Using the updated remainingAmount from the previous step
      if (creditNote.remainingAmount > 0.01 && creditNote.remainingAmount < creditNote.initialAmount - 0.01) {
        newCreditNoteStatus = CreditNoteStatus.PARTIALLY_USED;
      } else if (Math.abs(creditNote.remainingAmount - creditNote.initialAmount) < 0.01) {
        newCreditNoteStatus = CreditNoteStatus.AVAILABLE;
      }
      
      await tx.creditNote.update({
        where: { id: creditNoteId },
        data: { status: newCreditNoteStatus },
      });

      return { success: true, message: 'Allocation d\'avoir supprimée.' };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return new NextResponse(error.message, { status: error.message === 'UNAUTHORIZED' ? 401 : 403 });
    }
    console.error("Erreur lors de la suppression de l'allocation d'avoir:", error);
    const errorMessage = error instanceof Error ? error.message : "Impossible de traiter la requête.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}