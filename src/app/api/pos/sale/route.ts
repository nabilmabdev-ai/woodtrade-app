// src/app/api/pos/sale/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
 * Gère la requête POST pour finaliser une vente depuis le POS.
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
    if (Math.abs(totalPaid - grandTotal) > 0.001) {
        return new NextResponse(JSON.stringify({ error: `Le total payé (${totalPaid.toFixed(2)}€) ne correspond pas au total de la vente (${grandTotal.toFixed(2)}€).` }), { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const item of cart) {
        const inventoryItem = await tx.inventory.findFirst({ where: { productVariantId: item.variantId } });
        if (!inventoryItem || inventoryItem.quantity < item.quantity) {
          throw new Error(`Stock insuffisant pour le produit ID: ${item.variantId}`);
        }
      }

      const order = await tx.customerOrder.create({
        data: {
          companyId, contactId, userId, subtotal, discount: totalDiscount, grandTotal, status: 'DELIVERED', 
          lines: {
            create: cart.map(item => ({ productVariantId: item.variantId, quantity: item.quantity, unitPrice: item.unitPrice, discount: item.discount, totalPrice: (item.quantity * item.unitPrice) - item.discount })),
          },
        },
      });

      for (const item of cart) {
        const inventory = await tx.inventory.findFirstOrThrow({ where: { productVariantId: item.variantId } });
        await tx.inventory.update({ where: { id: inventory.id }, data: { quantity: { decrement: item.quantity } } });
        await tx.inventoryMovement.create({ data: { inventoryId: inventory.id, quantity: -item.quantity, type: 'OUT', reason: `Vente POS - Commande ${order.id}` } });
      }

      const invoice = await tx.invoice.create({
        data: { orderId: order.id, status: 'PAID', subtotal, discount: totalDiscount, total: grandTotal, issueDate: new Date(), dueDate: new Date() },
      });

      for (const payment of payments) {
        await tx.payment.create({
          data: {
            // --- CORRECTION APPLIED HERE ---
            // The 'companyId' is now required for every payment.
            companyId: companyId,
            invoiceId: invoice.id,
            amount: payment.amount,
            method: payment.method,
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