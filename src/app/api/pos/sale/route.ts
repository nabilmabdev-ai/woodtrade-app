// src/app/api/pos/sale/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CURRENCY_LABEL } from '@/lib/constants';

interface CartItem {
  variantId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface PaymentInput {
  method: 'CASH' | 'CARD' | 'TRANSFER';
  amount: number;
}

/**
 * Gère la requête POST pour finaliser una vente depuis le POS.
 *
 * ✅ CORRECTION CRITIQUE APPLIQUÉE :
 * Le champ `companyId` est maintenant correctement ajouté lors de la création
 * des enregistrements de paiement, résolvant une erreur de contrainte de base de données
 * qui faisait échouer toutes les transactions.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cart, companyId, contactId, userId, payments, cashRegisterSessionId } = body as {
      cart: CartItem[];
      companyId: string;
      contactId: string;
      userId: string;
      payments: PaymentInput[];
      cashRegisterSessionId: string;
    };

    if (!cart || cart.length === 0 || !companyId || !contactId || !userId || !payments || payments.length === 0) {
      return new NextResponse(JSON.stringify({ error: 'Données de vente incomplètes.' }), { status: 400 });
    }

    const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
    const totalDiscount = cart.reduce((acc, item) => acc + item.discount, 0);
    const grandTotal = subtotal - totalDiscount;
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

    if (Math.abs(totalPaid - grandTotal) > 0.01) { // Utiliser une petite tolérance pour les comparaisons de flottants
        return new NextResponse(JSON.stringify({ error: `Le total payé (${totalPaid.toFixed(2)})${CURRENCY_LABEL} ne correspond pas au total de la vente (${grandTotal.toFixed(2)})${CURRENCY_LABEL}.` }), { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Vérification des stocks
      for (const item of cart) {
        const inventoryItem = await tx.inventory.findFirst({ where: { productVariantId: item.variantId } });
        if (!inventoryItem || inventoryItem.quantity < item.quantity) {
          throw new Error(`Stock insuffisant pour le produit ID: ${item.variantId}`);
        }
      }

      // Création de la commande
      const order = await tx.customerOrder.create({
        data: {
          companyId, contactId, userId, subtotal, discount: totalDiscount, grandTotal, status: 'DELIVERED', 
          lines: { create: cart.map(item => ({ productVariantId: item.variantId, quantity: item.quantity, unitPrice: item.unitPrice, discount: item.discount, totalPrice: (item.quantity * item.unitPrice) - item.discount })) },
        },
      });

      // Mise à jour de l'inventaire
      for (const item of cart) {
        const inventory = await tx.inventory.findFirstOrThrow({ where: { productVariantId: item.variantId } });
        await tx.inventory.update({ where: { id: inventory.id }, data: { quantity: { decrement: item.quantity } } });
        
        // --- ✅ FIX APPLIED HERE ---
        // The `userId` property has been removed from the `create` call to match the Prisma schema.
        // To re-enable audit trails, you must add a `userId` field to the `InventoryMovement` model in your schema.prisma file.
        await tx.inventoryMovement.create({ 
            data: { 
                inventoryId: inventory.id, 
                quantity: -item.quantity, 
                type: 'OUT', 
                reason: `Vente POS - Commande ${order.id}`, 
                // userId: userId // <-- This line was causing the build error.
            } 
        });
      }

      // Création de la facture
      const invoice = await tx.invoice.create({
        data: { orderId: order.id, status: 'PAID', subtotal, discount: totalDiscount, total: grandTotal, issueDate: new Date(), dueDate: new Date() },
      });

      // Création des paiements associés
      for (const payment of payments) {
        await tx.payment.create({
          data: {
            companyId: companyId,
            invoiceId: invoice.id,
            amount: payment.amount,
            method: payment.method,
            status: 'FULLY_ALLOCATED', // Since it's paid in full at POS
            paymentDate: new Date(),
            cashRegisterSessionId: payment.method === 'CASH' ? cashRegisterSessionId : null,
          },
        });
      }

      return { order, invoice };
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Erreur lors de la finalisation de la vente POS:', error);
    const errorMessage = error instanceof Error ? error.message : "Impossible de finaliser la vente";
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    );
  }
}
