// src/app/api/invoices/[id]/settle/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';
import { CURRENCY_LABEL } from '@/lib/constants';

interface SettlePayload {
  sourceType: 'PAYMENT' | 'CREDIT_NOTE';
  sourceId: string;
  amountToAllocate: number;
}

/**
 * Gère la requête POST pour affecter un paiement ou un avoir à une facture spécifique.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await context.params;
    const body = await request.json() as SettlePayload;
    const { sourceType, sourceId, amountToAllocate } = body;

    if (!sourceType || !sourceId || !amountToAllocate || amountToAllocate <= 0) {
      return new NextResponse(JSON.stringify({ error: "Données d'affectation invalides." }), { status: 400 });
    }

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      // 1. Récupérer la facture et calculer le montant déjà payé
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
        include: { paymentAllocations: true, creditNoteAllocations: true },
      });

      const totalAllocated = 
        invoice.paymentAllocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0) +
        invoice.creditNoteAllocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
      
      const remainingDue = invoice.total - totalAllocated;

      if (amountToAllocate > remainingDue + 0.001) { // Tolérance pour les erreurs de floating point
        throw new Error(`Le montant à affecter (${amountToAllocate.toFixed(2)})${CURRENCY_LABEL} dépasse le solde dû (${remainingDue.toFixed(2)})${CURRENCY_LABEL}.`);
      }

      // 2. Vérifier la source et créer l'allocation
      if (sourceType === 'PAYMENT') {
        const payment = await tx.payment.findUniqueOrThrow({ where: { id: sourceId }, include: { allocations: true } });
        const paymentAllocatedAmount = payment.allocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
        const paymentRemainingAmount = payment.amount - paymentAllocatedAmount;

        if (amountToAllocate > paymentRemainingAmount + 0.001) {
            throw new Error(`Le montant à affecter (${amountToAllocate.toFixed(2)})${CURRENCY_LABEL} dépasse le solde du paiement (${paymentRemainingAmount.toFixed(2)})${CURRENCY_LABEL}.`);
        }

        await tx.paymentAllocation.create({
            data: {
                invoiceId: invoiceId,
                paymentId: sourceId,
                amountAllocated: amountToAllocate,
            }
        });

        const newPaymentAllocatedAmount = paymentAllocatedAmount + amountToAllocate;
        await tx.payment.update({
            where: { id: sourceId },
            data: {
                status: Math.abs(payment.amount - newPaymentAllocatedAmount) < 0.01 ? PaymentStatus.FULLY_ALLOCATED : PaymentStatus.PARTIALLY_ALLOCATED
            }
        });

      } else if (sourceType === 'CREDIT_NOTE') {
        const creditNote = await tx.creditNote.findUniqueOrThrow({ where: { id: sourceId } });

        if (amountToAllocate > creditNote.remainingAmount + 0.001) {
          throw new Error(`Le montant à affecter (${amountToAllocate.toFixed(2)})${CURRENCY_LABEL} dépasse le solde de l'avoir (${creditNote.remainingAmount.toFixed(2)})${CURRENCY_LABEL}.`);
        }

        await tx.creditNoteAllocation.create({
          data: { invoiceId: invoiceId, creditNoteId: sourceId, amountAllocated: amountToAllocate },
        });

        await tx.creditNote.update({
          where: { id: sourceId },
          data: {
            remainingAmount: { decrement: amountToAllocate },
            status: creditNote.remainingAmount - amountToAllocate < 0.01 ? 'FULLY_USED' : 'PARTIALLY_USED'
          },
        });
      }

      // 3. Mettre à jour le statut de la facture
      const newTotalAllocated = totalAllocated + amountToAllocate;
      let newStatus: InvoiceStatus = invoice.status;

      if (Math.abs(invoice.total - newTotalAllocated) < 0.01) {
        newStatus = InvoiceStatus.PAID;
      } else if (newTotalAllocated > 0) {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      }

      const finalInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus },
      });
      
      return finalInvoice;
    });

    return NextResponse.json(updatedInvoice, { status: 200 });

  } catch (error) {
    console.error("Erreur lors de l'affectation à la facture:", error);
    const errorMessage = error instanceof Error ? error.message : "Impossible de traiter la requête.";
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    );
  }
}