// src/app/api/purchasing/reconciliation/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierInvoiceStatus, SupplierPaymentStatus } from '@prisma/client';

interface ReconciliationPayload {
  paymentId: string;
  invoiceIds: string[];
}

/**
 * Gère la requête POST pour rapprocher un paiement fournisseur
 * avec une ou plusieurs factures.
 *
 * ✅ ROBUSTESSE APPLIQUÉE : Tous les calculs monétaires sont effectués en centimes pour
 * garantir la précision et éviter les erreurs de virgule flottante.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as ReconciliationPayload;
    const { paymentId, invoiceIds } = body;

    if (!paymentId || !invoiceIds || invoiceIds.length === 0) {
      return new NextResponse(JSON.stringify({ error: "Données de rapprochement invalides." }), { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Récupérer le paiement et calculer son solde disponible en centimes.
      const payment = await tx.supplierPayment.findUniqueOrThrow({
        where: { id: paymentId },
        include: { allocations: true },
      });

      const paymentAmountInCents = Math.round(payment.amount * 100);
      const totalAllocatedInCents = payment.allocations.reduce((sum, alloc) => sum + Math.round(alloc.amountAllocated * 100), 0);
      let remainingPaymentInCents = paymentAmountInCents - totalAllocatedInCents;

      if (remainingPaymentInCents <= 0) {
        throw new Error("Ce paiement est déjà entièrement utilisé.");
      }

      // 2. Récupérer les factures à payer, triées par date d'échéance.
      const invoicesToSettle = await tx.supplierInvoice.findMany({
        where: {
          id: { in: invoiceIds },
          status: { in: [SupplierInvoiceStatus.UNPAID, SupplierInvoiceStatus.PARTIALLY_PAID] },
        },
        include: { allocations: true },
        orderBy: { dueDate: 'asc' },
      });

      let totalAllocatedInThisRunInCents = 0;

      // 3. Boucler sur chaque facture et allouer le paiement en utilisant des entiers (centimes).
      for (const invoice of invoicesToSettle) {
        if (remainingPaymentInCents <= 0) break; // Arrêter si le paiement est épuisé.

        const invoiceTotalInCents = Math.round(invoice.total * 100);
        const invoiceAllocatedInCents = invoice.allocations.reduce((sum, alloc) => sum + Math.round(alloc.amountAllocated * 100), 0);
        const invoiceRemainingDueInCents = invoiceTotalInCents - invoiceAllocatedInCents;
        
        const amountToAllocateInCents = Math.min(remainingPaymentInCents, invoiceRemainingDueInCents);

        if (amountToAllocateInCents > 0) {
          // Créer l'enregistrement d'allocation (stocker la valeur décimale).
          await tx.supplierPaymentAllocation.create({
            data: {
              paymentId: paymentId,
              invoiceId: invoice.id,
              amountAllocated: amountToAllocateInCents / 100,
            },
          });
          
          remainingPaymentInCents -= amountToAllocateInCents;
          totalAllocatedInThisRunInCents += amountToAllocateInCents;
        }
      }

      // 4. Mettre à jour le statut de toutes les factures modifiées après la boucle.
      // C'est plus efficace que de le faire dans la boucle.
      for (const invoice of invoicesToSettle) {
          const updatedInvoice = await tx.supplierInvoice.findUniqueOrThrow({ 
              where: { id: invoice.id },
              include: { allocations: true }
          });
          const newTotalAllocatedToInvoiceCents = updatedInvoice.allocations.reduce((s, a) => s + Math.round(a.amountAllocated * 100), 0);
          
          if (Math.round(updatedInvoice.total * 100) - newTotalAllocatedToInvoiceCents === 0) {
              await tx.supplierInvoice.update({ where: { id: invoice.id }, data: { status: SupplierInvoiceStatus.PAID }});
          } else if (newTotalAllocatedToInvoiceCents > 0) {
              await tx.supplierInvoice.update({ where: { id: invoice.id }, data: { status: SupplierInvoiceStatus.PARTIALLY_PAID }});
          }
      }

      // 5. Mettre à jour le statut du paiement source à la fin.
      let newPaymentStatus: SupplierPaymentStatus;
      if (remainingPaymentInCents === 0) {
        newPaymentStatus = SupplierPaymentStatus.FULLY_ALLOCATED;
      } else if (remainingPaymentInCents < paymentAmountInCents) {
        newPaymentStatus = SupplierPaymentStatus.PARTIALLY_ALLOCATED;
      } else {
        newPaymentStatus = SupplierPaymentStatus.AVAILABLE;
      }
      
      await tx.supplierPayment.update({
        where: { id: payment.id },
        data: { status: newPaymentStatus },
      });

      // Retourner le montant total alloué dans cette opération (en décimal).
      return { totalAllocated: totalAllocatedInThisRunInCents / 100 };
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Erreur lors du rapprochement des paiements fournisseurs:", error);
    const errorMessage = error instanceof Error ? error.message : "Impossible de traiter la requête.";
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    );
  }
}