// src/app/api/returns/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Role, CashRegisterSessionStatus } from '@prisma/client';

interface ReturnItem {
  productVariantId: string;
  quantity: number;
  unitPrice: number;
}

type ReturnOutcome = 
  | { type: 'REFUND'; method: 'CASH' | 'CARD' | 'TRANSFER'; cashRegisterSessionId?: string }
  | { type: 'CREDIT_NOTE' };

// Rôles autorisés à effectuer un retour/remboursement
const ALLOWED_ROLES: Role[] = [Role.CASHIER, Role.ADMIN, Role.SUPER_ADMIN, Role.MANAGER];

/**
 * Gère la requête POST pour traiter un retour de produit.
 * CORRECTIF : Valide la facture, la session de caisse, le rôle de l'utilisateur et crée un mouvement de stock traçable.
 */
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  // --- 1. SÉCURITÉ : Vérification de l'utilisateur et de ses droits ---
  if (!session) {
    return new NextResponse(JSON.stringify({ error: 'Non autorisé.' }), { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return new NextResponse(JSON.stringify({ error: 'Accès refusé. Rôle non autorisé.' }), { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      originalOrderId,
      // CORRECTIF : On attend l'ID de la facture spécifique
      originalInvoiceId,
      items,
      reason,
      outcome, 
    } = body as {
      originalOrderId: string;
      originalInvoiceId: string; // NOUVEAU champ requis
      items: ReturnItem[];
      reason?: string;
      outcome: ReturnOutcome;
    };

    // --- 2. VALIDATION DES DONNÉES D'ENTRÉE ---
    if (!originalOrderId || !originalInvoiceId || !items || items.length === 0 || !outcome) {
      return new NextResponse(JSON.stringify({ error: 'Données de retour incomplètes.' }), { status: 400 });
    }
    if (outcome.type === 'REFUND' && outcome.method === 'CASH' && !outcome.cashRegisterSessionId) {
      return new NextResponse(JSON.stringify({ error: 'La session de caisse est requise pour un remboursement en espèces.' }), { status: 400 });
    }

    const totalAmount = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
    if (totalAmount <= 0) {
        return new NextResponse(JSON.stringify({ error: 'Le montant du retour doit être positif.' }), { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // --- 3. VÉRIFICATIONS DANS LA TRANSACTION ---
      
      // Vérifier la commande originale et s'assurer que la facture fournie lui appartient
      const originalOrder = await tx.customerOrder.findUnique({
        where: { id: originalOrderId },
        include: { invoices: true }
      });
      if (!originalOrder) throw new Error("La commande originale n'a pas été trouvée.");
      const invoiceExistsOnOrder = originalOrder.invoices.some(inv => inv.id === originalInvoiceId);
      if (!invoiceExistsOnOrder) throw new Error("La facture fournie ne correspond pas à la commande originale.");
      
      // Vérifier la validité de la session de caisse si nécessaire
      if (outcome.type === 'REFUND' && outcome.method === 'CASH') {
        const cashSession = await tx.cashRegisterSession.findUnique({ where: { id: outcome.cashRegisterSessionId } });
        if (!cashSession || cashSession.status !== CashRegisterSessionStatus.OPEN) {
            throw new Error("Session de caisse invalide ou fermée.");
        }
      }
      
      // CORRECTION @typescript-eslint/no-unused-vars: La boucle vide qui causait le warning a été supprimée.

      // 4. Créer l'enregistrement de retour (ReturnOrder)
      const returnOrder = await tx.returnOrder.create({
        data: {
          originalOrderId,
          processedByUserId: user.id, // On utilise l'ID de l'utilisateur authentifié
          reason,
          totalRefund: totalAmount,
          lines: {
            create: items.map(item => ({
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
        },
      });

      // 5. Gérer le remboursement ou l'avoir
      if (outcome.type === 'REFUND') {
        await tx.refund.create({
          data: {
              returnOrderId: returnOrder.id,
              invoiceId: originalInvoiceId, // On utilise l'ID validé
              amount: totalAmount,
              method: outcome.method,
              cashRegisterSessionId: outcome.method === 'CASH' ? outcome.cashRegisterSessionId : null,
          }
        });
        await tx.invoice.update({
            where: { id: originalInvoiceId },
            data: { status: 'REFUNDED' }
        });
      } else if (outcome.type === 'CREDIT_NOTE') {
        // ... (la logique de création d'avoir reste la même)
      }

      // 6. [CORRECTIF INVENTAIRE] Mettre à jour les stocks via un mouvement traçable
      for (const item of items) {
        const inventoryItem = await tx.inventory.findFirstOrThrow({
            where: { productVariantId: item.productVariantId }
        });

        await tx.inventory.update({
          where: { id: inventoryItem.id },
          data: { quantity: { increment: item.quantity } },
        });
        
        // --- ✅ FIX APPLIED HERE ---
        // The invalid 'referenceId' field has been removed.
        // The ID of the return is now appended to the 'reason' field for traceability.
        await tx.inventoryMovement.create({
          data: {
            inventoryId: inventoryItem.id,
            quantity: item.quantity, // Quantité positive car c'est un retour
            type: 'RETURN_IN', // Type spécifique pour les retours
            reason: `Retour commande #${originalOrder.id.substring(0, 8)}. Ref Retour: ${returnOrder.id}`,
          }
        });
      }

      // 7. Mettre à jour le statut de la commande originale
      await tx.customerOrder.update({
          where: { id: originalOrderId },
          data: { status: 'RETURNED' }
      });
      
      // 8. [PISTE D'AUDIT] Log de l'action
      console.log(`AUDIT: User '${user.email}' processed a return (ID: ${returnOrder.id}) for order '${originalOrderId}'. Outcome: ${outcome.type}.`);

      return returnOrder;
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error("Erreur lors du traitement du retour:", error);
    const errorMessage = error instanceof Error ? error.message : "Impossible de traiter le retour.";
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    );
  }
}