// src/app/api/purchasing/invoices/[id]/void/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierInvoiceStatus, SupplierPaymentStatus } from '@prisma/client';
// SIMULATION: Dans une vraie application, vous importeriez une fonction pour obtenir l'utilisateur actuel
// import { getCurrentUser } from '@/lib/session';

/**
 * Gère la requête POST pour annuler (void) une facture fournisseur.
 * CORRECTIF : Empêche l'annulation si des marchandises ont déjà été réceptionnées.
 * CORRECTIF : Recalcule et met à jour correctement le statut des paiements qui étaient affectés.
 * CORRECTIF : Ajout d'un log pour la piste d'audit.
 * CORRECTIF : Syntaxe de la fonction 'reduce' corrigée.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await context.params;

    // --- BLOC DE SÉCURITÉ (SIMULÉ) ---
    // const user = await getCurrentUser();
    // if (!user) { return new NextResponse(JSON.stringify({ error: "Non autorisé." }), { status: 403 }); }
    const simulatedUserId = 'user_abc_123'; // ID d'utilisateur factice pour le log

    const voidedInvoice = await prisma.$transaction(async (tx) => {
      // 1. Récupérer la facture et ses relations
      const invoice = await tx.supplierInvoice.findUnique({
        where: { id: invoiceId },
        include: { allocations: true, lines: true },
      });

      if (!invoice) {
        throw new Error('Facture non trouvée.');
      }
      if (invoice.status === SupplierInvoiceStatus.VOID) {
        return invoice; // Déjà annulée, pas d'action nécessaire.
      }
      
      // 2. [SÉCURITÉ MÉTIER] Vérifier si des articles ont été réceptionnés.
      const hasReceivedItems = invoice.lines.some(line => line.receivedQuantity > 0);
      if (hasReceivedItems) {
        throw new Error("Impossible d'annuler : des articles de cette facture ont déjà été réceptionnés en stock. Vous devez d'abord annuler la réception via un ajustement de stock négatif.");
      }

      const paymentIdsToUpdate = invoice.allocations.map(alloc => alloc.paymentId);

      // 3. Supprimer toutes les allocations liées à cette facture
      if (invoice.allocations.length > 0) {
        await tx.supplierPaymentAllocation.deleteMany({
          where: { invoiceId: invoiceId },
        });
      }

      // 4. Mettre à jour le statut de la facture à VOID
      const updatedInvoice = await tx.supplierInvoice.update({
        where: { id: invoiceId },
        data: { status: SupplierInvoiceStatus.VOID },
      });
      
      // 5. [CORRECTIF CLÉ] Mettre à jour le statut de chaque paiement affecté
      for (const paymentId of paymentIdsToUpdate) {
        const payment = await tx.supplierPayment.findUniqueOrThrow({
          where: { id: paymentId },
          include: { allocations: true }, // Récupérer les allocations restantes
        });

        // La valeur initiale '0' est cruciale ici
        const totalAllocated = payment.allocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
        let newStatus: SupplierPaymentStatus;

        if (totalAllocated === 0) {
          // Si plus aucune allocation n'existe, le paiement est à nouveau entièrement disponible.
          newStatus = SupplierPaymentStatus.AVAILABLE;
        } else if (Math.abs(payment.amount - totalAllocated) < 0.01) {
          // Ce cas est peu probable ici mais reste pour la robustesse.
          newStatus = SupplierPaymentStatus.FULLY_ALLOCATED;
        } else {
          // Si d'autres allocations existent, il est partiellement alloué.
          newStatus = SupplierPaymentStatus.PARTIALLY_ALLOCATED;
        }

        await tx.supplierPayment.update({
          where: { id: paymentId },
          data: { status: newStatus },
        });
      }
      
      // 6. [PISTE D'AUDIT] Log de l'action
      console.log(`AUDIT: User '${simulatedUserId}' voided supplier invoice '${invoiceId}'.`);

      return updatedInvoice;
    });

    return NextResponse.json(voidedInvoice, { status: 200 });

  } catch (error) {
    console.error("Erreur lors de l'annulation de la facture fournisseur:", error);
    const errorMessage = error instanceof Error ? error.message : "Impossible de traiter la requête.";
    // Renvoyer une erreur 409 (Conflict) si la logique métier empêche l'action
    if (errorMessage.startsWith("Impossible d'annuler")) {
        return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 409 });
    }
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    );
  }
}