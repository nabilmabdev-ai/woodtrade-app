// src/app/api/billing/reconciliation/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InvoiceStatus, PaymentStatus, CreditNoteStatus } from '@prisma/client';

interface ReconciliationPayload {
  sourceId: string;
  sourceType: 'PAYMENT' | 'CREDIT_NOTE';
  invoiceIds: string[];
}

/**
 * Gère la requête POST pour rapprocher une source (paiement ou avoir)
 * avec une ou plusieurs factures client.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as ReconciliationPayload;
    const { sourceId, sourceType, invoiceIds } = body;

    if (!sourceId || !sourceType || !invoiceIds || invoiceIds.length === 0) {
      return new NextResponse(JSON.stringify({ error: "Données de rapprochement invalides." }), { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let remainingSourceAmount: number;
      let totalAllocatedInThisRun = 0;

      // 1. Récupérer les factures à payer, triées par date d'échéance
      const invoicesToSettle = await tx.invoice.findMany({
        where: { id: { in: invoiceIds }, status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] } },
        include: { paymentAllocations: true, creditNoteAllocations: true },
        orderBy: { dueDate: 'asc' },
      });
      
      // 2. Traiter en fonction du type de source (Paiement ou Avoir)
      if (sourceType === 'PAYMENT') {
        const payment = await tx.payment.findUniqueOrThrow({
            where: { id: sourceId },
            include: { allocations: true },
        });
        remainingSourceAmount = payment.amount - payment.allocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);

        if (remainingSourceAmount <= 0.001) throw new Error("Ce paiement est déjà entièrement utilisé.");

        for (const invoice of invoicesToSettle) {
            if (remainingSourceAmount <= 0.001) break;
            const invoiceRemainingDue = invoice.total - (
                invoice.paymentAllocations.reduce((s, a) => s + a.amountAllocated, 0) +
                invoice.creditNoteAllocations.reduce((s, a) => s + a.amountAllocated, 0)
            );
            const amountToAllocate = Math.min(remainingSourceAmount, invoiceRemainingDue);

            if (amountToAllocate > 0) {
                await tx.paymentAllocation.create({ data: { paymentId: sourceId, invoiceId: invoice.id, amountAllocated: amountToAllocate }});
                remainingSourceAmount -= amountToAllocate;
                totalAllocatedInThisRun += amountToAllocate;
            }
        }
        // Mettre à jour le statut du paiement après la boucle
        const finalTotalAllocated = (payment.allocations.reduce((s, a) => s + a.amountAllocated, 0)) + totalAllocatedInThisRun;
        await tx.payment.update({
            where: { id: sourceId },
            data: { status: Math.abs(payment.amount - finalTotalAllocated) < 0.01 ? PaymentStatus.FULLY_ALLOCATED : PaymentStatus.PARTIALLY_ALLOCATED }
        });
      } else { // sourceType === 'CREDIT_NOTE'
        const creditNote = await tx.creditNote.findUniqueOrThrow({ where: { id: sourceId } });
        remainingSourceAmount = creditNote.remainingAmount;

        if (remainingSourceAmount <= 0.001) throw new Error("Cet avoir est déjà entièrement utilisé.");

        for (const invoice of invoicesToSettle) {
            if (remainingSourceAmount <= 0.001) break;
            const invoiceRemainingDue = invoice.total - (
                invoice.paymentAllocations.reduce((s, a) => s + a.amountAllocated, 0) +
                invoice.creditNoteAllocations.reduce((s, a) => s + a.amountAllocated, 0)
            );
            const amountToAllocate = Math.min(remainingSourceAmount, invoiceRemainingDue);
            
            if (amountToAllocate > 0) {
                await tx.creditNoteAllocation.create({ data: { creditNoteId: sourceId, invoiceId: invoice.id, amountAllocated: amountToAllocate }});
                remainingSourceAmount -= amountToAllocate;
                totalAllocatedInThisRun += amountToAllocate;
            }
        }
        // Mettre à jour le statut de l'avoir après la boucle
        await tx.creditNote.update({
            where: { id: sourceId },
            data: { 
                remainingAmount: { decrement: totalAllocatedInThisRun },
                status: remainingSourceAmount < 0.01 ? CreditNoteStatus.FULLY_USED : CreditNoteStatus.PARTIALLY_USED
            }
        });
      }

      // 3. Mettre à jour le statut de toutes les factures modifiées
      // On refait une boucle pour s'assurer que le statut est correct même si plusieurs sources ont été allouées dans des transactions différentes
      for (const invoice of invoicesToSettle) {
          const updatedInvoice = await tx.invoice.findUniqueOrThrow({ 
              where: { id: invoice.id },
              include: { paymentAllocations: true, creditNoteAllocations: true }
          });
          const newTotalAllocated = updatedInvoice.paymentAllocations.reduce((s, a) => s + a.amountAllocated, 0) + updatedInvoice.creditNoteAllocations.reduce((s, a) => s + a.amountAllocated, 0);
          
          if (Math.abs(updatedInvoice.total - newTotalAllocated) < 0.01) {
              await tx.invoice.update({ where: { id: invoice.id }, data: { status: InvoiceStatus.PAID }});
          } else if (newTotalAllocated > 0) {
              await tx.invoice.update({ where: { id: invoice.id }, data: { status: InvoiceStatus.PARTIALLY_PAID }});
          }
      }

      return { totalAllocated: totalAllocatedInThisRun };
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Erreur lors du rapprochement client:", error);
    const errorMessage = error instanceof Error ? error.message : "Impossible de traiter la requête.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}