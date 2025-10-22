// src/app/api/purchasing/invoices/[id]/settle/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierInvoiceStatus, SupplierPaymentStatus } from '@prisma/client';

interface SettlePayload {
  paymentId: string;
  amountToAllocate: number;
}

/**
 * Gère la requête POST pour affecter un paiement à une facture fournisseur spécifique.
 *
 * ✅ ROBUSTESSE APPLIQUÉE : Tous les calculs monétaires sont effectués en centimes pour
 * éviter les erreurs de précision liées aux nombres à virgule flottante.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await context.params;
    const body = await request.json() as SettlePayload;
    const { paymentId, amountToAllocate } = body;
    
    // ✅ FIX: Convertir le montant à allouer en centimes dès le début.
    const amountToAllocateInCents = Math.round(amountToAllocate * 100);

    if (!paymentId || !amountToAllocate || amountToAllocateInCents <= 0) {
      return new NextResponse(JSON.stringify({ error: "Données d'affectation invalides." }), { status: 400 });
    }

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      // 1. Récupérer la facture et calculer le solde dû en centimes.
      const invoice = await tx.supplierInvoice.findUniqueOrThrow({
        where: { id: invoiceId },
        include: { allocations: true },
      });

      const invoiceTotalInCents = Math.round(invoice.total * 100);
      const totalAllocatedInCents = invoice.allocations.reduce((sum, alloc) => sum + Math.round(alloc.amountAllocated * 100), 0);
      const remainingDueInCents = invoiceTotalInCents - totalAllocatedInCents;

      if (amountToAllocateInCents > remainingDueInCents) {
        throw new Error(`Le montant à affecter (${(amountToAllocateInCents / 100).toFixed(2)}€) dépasse le solde dû (${(remainingDueInCents / 100).toFixed(2)}€).`);
      }

      // 2. Vérifier le paiement source et son solde disponible en centimes.
      const payment = await tx.supplierPayment.findUniqueOrThrow({ 
        where: { id: paymentId }, 
        include: { allocations: true } 
      });

      const paymentAmountInCents = Math.round(payment.amount * 100);
      const paymentAllocatedInCents = payment.allocations.reduce((sum, alloc) => sum + Math.round(alloc.amountAllocated * 100), 0);
      const paymentRemainingInCents = paymentAmountInCents - paymentAllocatedInCents;

      if (amountToAllocateInCents > paymentRemainingInCents) {
          throw new Error(`Le montant à affecter (${(amountToAllocateInCents / 100).toFixed(2)}€) dépasse le solde du paiement (${(paymentRemainingInCents / 100).toFixed(2)}€).`);
      }

      // 3. Créer l'enregistrement d'allocation.
      await tx.supplierPaymentAllocation.create({
          data: {
              invoiceId: invoiceId,
              paymentId: paymentId,
              amountAllocated: amountToAllocate, // La valeur décimale est stockée en BDD.
          }
      });

      // 4. Mettre à jour le statut du paiement en se basant sur les calculs en centimes.
      const newPaymentAllocatedInCents = paymentAllocatedInCents + amountToAllocateInCents;
      await tx.supplierPayment.update({
          where: { id: paymentId },
          data: {
              status: (paymentAmountInCents - newPaymentAllocatedInCents === 0) 
                  ? SupplierPaymentStatus.FULLY_ALLOCATED 
                  : SupplierPaymentStatus.PARTIALLY_ALLOCATED
          }
      });

      // 5. Mettre à jour le statut de la facture en se basant sur les calculs en centimes.
      const newTotalAllocatedInCents = totalAllocatedInCents + amountToAllocateInCents;
      let newStatus: SupplierInvoiceStatus = invoice.status;

      if (invoiceTotalInCents - newTotalAllocatedInCents === 0) {
        newStatus = SupplierInvoiceStatus.PAID;
      } else if (newTotalAllocatedInCents > 0) {
        newStatus = SupplierInvoiceStatus.PARTIALLY_PAID;
      }

      const finalInvoice = await tx.supplierInvoice.update({
        where: { id: invoiceId },
        data: { status: newStatus },
      });
      
      return finalInvoice;
    });

    return NextResponse.json(updatedInvoice, { status: 200 });

  } catch (error) {
    console.error("Erreur lors de l'affectation à la facture fournisseur:", error);
    const errorMessage = error instanceof Error ? error.message : "Impossible de traiter la requête.";
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    );
  }
}