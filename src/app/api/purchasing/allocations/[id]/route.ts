// src/app/api/purchasing/allocations/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierInvoiceStatus, SupplierPaymentStatus } from '@prisma/client';

/**
 * Gère la requête DELETE pour supprimer une allocation de paiement fournisseur.
 * Cela a pour effet de "détacher" un paiement d'une facture, rendant les fonds
 * à nouveau disponibles et mettant à jour le statut de la facture.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: allocationId } = await context.params;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Trouver l'allocation à supprimer pour obtenir les IDs de la facture et du paiement.
      const allocation = await tx.supplierPaymentAllocation.findUnique({
        where: { id: allocationId },
      });

      if (!allocation) {
        throw new Error('Allocation non trouvée.');
      }

      const { invoiceId, paymentId } = allocation;

      // 2. Supprimer l'enregistrement d'allocation.
      await tx.supplierPaymentAllocation.delete({
        where: { id: allocationId },
      });

      // 3. Récupérer la facture et recalculer son statut.
      const invoice = await tx.supplierInvoice.findUniqueOrThrow({
        where: { id: invoiceId },
        include: { allocations: true },
      });

      const totalAllocatedToInvoice = invoice.allocations
        .filter(alloc => alloc.id !== allocationId) // Exclure celle qu'on vient de supprimer
        .reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
      
      let newInvoiceStatus: SupplierInvoiceStatus = SupplierInvoiceStatus.UNPAID;
      if (Math.abs(invoice.total - totalAllocatedToInvoice) < 0.01) {
        newInvoiceStatus = SupplierInvoiceStatus.PAID;
      } else if (totalAllocatedToInvoice > 0) {
        newInvoiceStatus = SupplierInvoiceStatus.PARTIALLY_PAID;
      }

      await tx.supplierInvoice.update({
        where: { id: invoiceId },
        data: { status: newInvoiceStatus },
      });

      // 4. Récupérer le paiement et recalculer son statut.
      const payment = await tx.supplierPayment.findUniqueOrThrow({
        where: { id: paymentId },
        include: { allocations: true },
      });

      const totalAllocatedFromPayment = payment.allocations
        .filter(alloc => alloc.id !== allocationId)
        .reduce((sum, alloc) => sum + alloc.amountAllocated, 0);

      let newPaymentStatus: SupplierPaymentStatus = SupplierPaymentStatus.AVAILABLE;
      if (Math.abs(payment.amount - totalAllocatedFromPayment) < 0.01) {
        newPaymentStatus = SupplierPaymentStatus.FULLY_ALLOCATED;
      } else if (totalAllocatedFromPayment > 0) {
        newPaymentStatus = SupplierPaymentStatus.PARTIALLY_ALLOCATED;
      }
      
      await tx.supplierPayment.update({
        where: { id: paymentId },
        data: { status: newPaymentStatus },
      });

      return { success: true, message: 'Allocation supprimée avec succès.' };
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Erreur lors de la suppression de l'allocation:", error);
    const errorMessage = error instanceof Error ? error.message : "Impossible de traiter la requête.";
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    );
  }
}