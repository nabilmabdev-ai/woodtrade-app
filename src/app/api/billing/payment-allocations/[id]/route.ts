// src/app/api/billing/payment-allocations/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InvoiceStatus, PaymentStatus, Role } from '@prisma/client';
import { authorize } from '@/lib/authorize';

/**
 * Gère la requête DELETE pour supprimer une allocation de paiement client.
 * Cela a pour effet de "détacher" un paiement d'une facture, rendant les fonds
 * à nouveau disponibles et mettant à jour le statut de la facture.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id:string }> }
) {
  try {
    const allowedRoles: Role[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'];
    // ✅ CORRECTION: Added the second argument to the authorize function for logging.
    await authorize(allowedRoles, 'DELETE /billing/payment-allocations');

    const { id: allocationId } = await context.params;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Trouver l'allocation pour obtenir les IDs de la facture et du paiement.
      const allocation = await tx.paymentAllocation.findUniqueOrThrow({
        where: { id: allocationId },
      });
      const { invoiceId, paymentId } = allocation;

      // 2. Supprimer l'enregistrement d'allocation.
      await tx.paymentAllocation.delete({
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

      // 4. Récupérer le paiement et recalculer son statut.
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: { allocations: true },
      });
      const totalAllocatedFromPayment = payment.allocations.reduce((s, a) => s + a.amountAllocated, 0);

      let newPaymentStatus: PaymentStatus = PaymentStatus.AVAILABLE;
      if (Math.abs(payment.amount - totalAllocatedFromPayment) < 0.01) {
        newPaymentStatus = PaymentStatus.FULLY_ALLOCATED;
      } else if (totalAllocatedFromPayment > 0) {
        newPaymentStatus = PaymentStatus.PARTIALLY_ALLOCATED;
      }
      await tx.payment.update({ where: { id: paymentId }, data: { status: newPaymentStatus } });

      return { success: true, message: 'Allocation supprimée.' };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return new NextResponse(error.message, { status: error.message === 'UNAUTHORIZED' ? 401 : 403 });
    }
    console.error("Erreur lors de la suppression de l'allocation de paiement:", error);
    const errorMessage = error instanceof Error ? error.message : "Impossible de traiter la requête.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}