// src/app/api/purchasing/invoices/[id]/void/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierInvoiceStatus, SupplierPaymentStatus } from '@prisma/client';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Role } from '@prisma/client';

// Define roles that are allowed to void an invoice (typically higher-level roles)
const ALLOWED_ROLES: Role[] = [Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT];

/**
 * Gère la requête POST pour annuler (void) une facture fournisseur.
 *
 * ✅ SÉCURITÉ ET ROBUSTESSE APPLIQUÉES :
 * 1.  Vérifie les droits de l'utilisateur.
 * 2.  Empêche l'annulation si des marchandises ont déjà été réceptionnées.
 * 3.  Recalcule correctement le statut des paiements qui étaient affectés.
 * 4.  Ajoute un log console pour la piste d'audit.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // 1. Authentification et Autorisation
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse(JSON.stringify({ error: "Non autorisé." }), { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return new NextResponse(JSON.stringify({ error: 'Accès refusé. Permissions insuffisantes.' }), { status: 403 });
    }

    const { id: invoiceId } = await context.params;

    const voidedInvoice = await prisma.$transaction(async (tx) => {
      // 2. Récupérer la facture et ses relations
      const invoice = await tx.supplierInvoice.findUnique({
        where: { id: invoiceId },
        include: { allocations: true, lines: true },
      });

      if (!invoice) throw new Error('Facture non trouvée.');
      if (invoice.status === SupplierInvoiceStatus.VOID) return invoice; // Déjà annulée.

      // 3. [FIX] SÉCURITÉ MÉTIER : Vérifier si des articles ont été réceptionnés.
      const hasReceivedItems = invoice.lines.some(line => line.receivedQuantity > 0);
      if (hasReceivedItems) {
        throw new Error("Impossible d'annuler : des articles de cette facture ont déjà été réceptionnés en stock. Vous devez d'abord annuler la réception via un ajustement de stock négatif.");
      }

      const paymentIdsToUpdate = invoice.allocations.map(alloc => alloc.paymentId);

      // 4. Supprimer toutes les allocations liées à cette facture
      if (invoice.allocations.length > 0) {
        await tx.supplierPaymentAllocation.deleteMany({ where: { invoiceId: invoiceId } });
      }

      // 5. Mettre à jour le statut de la facture à VOID
      const updatedInvoice = await tx.supplierInvoice.update({
        where: { id: invoiceId },
        data: { status: SupplierInvoiceStatus.VOID },
      });
      
      // 6. [FIX] Mettre à jour le statut de chaque paiement affecté
      for (const paymentId of paymentIdsToUpdate) {
        const payment = await tx.supplierPayment.findUniqueOrThrow({
          where: { id: paymentId },
          include: { allocations: true }, // Récupérer les allocations restantes après la suppression
        });

        // La valeur initiale '0' est cruciale pour le bon fonctionnement de reduce.
        const totalAllocated = payment.allocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
        
        let newStatus: SupplierPaymentStatus;
        if (totalAllocated === 0) {
          newStatus = SupplierPaymentStatus.AVAILABLE;
        } else if (Math.abs(payment.amount - totalAllocated) < 0.01) {
          newStatus = SupplierPaymentStatus.FULLY_ALLOCATED;
        } else {
          newStatus = SupplierPaymentStatus.PARTIALLY_ALLOCATED;
        }

        await tx.supplierPayment.update({ where: { id: paymentId }, data: { status: newStatus } });
      }
      
      // 7. [PISTE D'AUDIT] Log de l'action
      console.log(`AUDIT: User '${user.email}' (ID: ${user.id}) voided supplier invoice '${invoiceId}'.`);

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
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}