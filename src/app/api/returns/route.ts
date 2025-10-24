// src/app/api/returns/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createServerClient } from '@supabase/ssr';
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

// Define the roles authorized to process returns.
const ALLOWED_ROLES: Role[] = [Role.CASHIER, Role.ADMIN, Role.SUPER_ADMIN, Role.MANAGER];

/**
 * Gère la requête POST pour traiter un retour de produit.
 *
 * SÉCURITÉ, VALIDATION ET INTÉGRITÉ APPLIQUÉES :
 * 1.  Vérifie que l'utilisateur a un rôle autorisé.
 * 2.  Valide que la facture fournie appartient bien à la commande originale.
 * 3.  Vérifie la validité de la session de caisse pour les remboursements en espèces.
 * 4.  Crée un mouvement de stock (InventoryMovement) pour une traçabilité complète.
 */
export async function POST(request: Request) {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
          },
        }
    );

  try {
    // 1. SÉCURITÉ : Vérification de l'utilisateur et de son rôle.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Non autorisé.' }), { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return new NextResponse(JSON.stringify({ error: 'Accès refusé. Rôle non autorisé.' }), { status: 403 });
    }

    // 2. VALIDATION DES DONNÉES D'ENTRÉE
    const body = await request.json();
    const {
      originalOrderId,
      originalInvoiceId,
      items,
      reason,
      outcome, 
    } = body as {
      originalOrderId: string;
      originalInvoiceId: string;
      items: ReturnItem[];
      reason?: string;
      outcome: ReturnOutcome;
    };

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
      // 3. VÉRIFICATIONS D'INTÉGRITÉ DANS LA TRANSACTION
      
      // Vérifier que la facture fournie appartient bien à la commande originale.
      const originalOrder = await tx.customerOrder.findUnique({
        where: { id: originalOrderId },
        include: { invoices: true }
      });
      if (!originalOrder) throw new Error("La commande originale n'a pas été trouvée.");
      const invoiceExistsOnOrder = originalOrder.invoices.some(inv => inv.id === originalInvoiceId);
      if (!invoiceExistsOnOrder) throw new Error("La facture fournie ne correspond pas à la commande originale.");
      
      // Vérifier la validité de la session de caisse si nécessaire.
      if (outcome.type === 'REFUND' && outcome.method === 'CASH') {
        const cashSession = await tx.cashRegisterSession.findUnique({ where: { id: outcome.cashRegisterSessionId } });
        if (!cashSession || cashSession.status !== CashRegisterSessionStatus.OPEN) {
            throw new Error("Session de caisse invalide ou fermée.");
        }
      }
      
      // 4. Créer l'enregistrement du retour (ReturnOrder).
      const returnOrder = await tx.returnOrder.create({
        data: {
          originalOrderId,
          processedByUserId: user.id,
          reason,
          totalRefund: totalAmount,
          lines: { create: items.map(item => ({ productVariantId: item.productVariantId, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.quantity * item.unitPrice })) },
        },
      });

      // 5. Gérer le résultat (Remboursement ou Avoir).
      if (outcome.type === 'REFUND') {
        await tx.refund.create({
          data: {
              returnOrderId: returnOrder.id,
              invoiceId: originalInvoiceId,
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
        await tx.creditNote.create({
          data: {
            companyId: originalOrder.companyId,
            initialAmount: totalAmount,
            remainingAmount: totalAmount,
            reason: `Avoir sur retour commande #${originalOrder.id.substring(0,8)}`,
            status: 'AVAILABLE',
          }
        });
      }

      // 6. Mettre à jour l'inventaire et créer un mouvement de stock traçable.
      for (const item of items) {
        const inventoryItem = await tx.inventory.findFirstOrThrow({ where: { productVariantId: item.productVariantId } });
        await tx.inventory.update({ where: { id: inventoryItem.id }, data: { quantity: { increment: item.quantity } } });
        
        await tx.inventoryMovement.create({
          data: {
            inventoryId: inventoryItem.id,
            quantity: item.quantity,
            type: 'RETURN_IN',
            reason: `Retour commande #${originalOrder.id.substring(0, 8)}. Ref Retour: ${returnOrder.id}`,
          }
        });
      }

      // 7. Mettre à jour le statut de la commande originale.
      await tx.customerOrder.update({ where: { id: originalOrderId }, data: { status: 'PARTIALLY_RETURNED' } });
      
      console.log(`AUDIT: User '${user.email}' processed return (ID: ${returnOrder.id}) for order '${originalOrderId}'. Outcome: ${outcome.type}.`);
      return returnOrder;
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error("Erreur lors du traitement du retour:", error);
    const errorMessage = error instanceof Error ? error.message : "Impossible de traiter le retour.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}