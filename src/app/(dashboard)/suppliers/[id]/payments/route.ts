// src/app/api/suppliers/[id]/payments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierPaymentStatus, Prisma } from '@prisma/client';

/**
 * Gère la requête GET pour récupérer tous les paiements d'un fournisseur spécifique.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplierId } = await context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // ex: 'available'

    if (!supplierId) {
      return new NextResponse(JSON.stringify({ error: "L'ID du fournisseur est manquant." }), { status: 400 });
    }

    const whereClause: Prisma.SupplierPaymentWhereInput = { supplierId: supplierId };

    // Si le paramètre 'status=available' est présent, on ne retourne que les paiements non entièrement alloués.
    if (status === 'available') {
      whereClause.status = {
        in: [SupplierPaymentStatus.AVAILABLE, SupplierPaymentStatus.PARTIALLY_ALLOCATED],
      };
    }

    const payments = await prisma.supplierPayment.findMany({
      where: whereClause,
      include: {
        allocations: true, // On inclut les allocations pour calculer le solde
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });
    
    // Pour chaque paiement, on calcule le montant restant et on l'ajoute à l'objet retourné.
    const paymentsWithBalance = payments.map(payment => {
      const totalAllocated = payment.allocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
      const remainingAmount = payment.amount - totalAllocated;
      return {
        id: payment.id,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        method: payment.method,
        status: payment.status,
        remainingAmount: remainingAmount,
      };
    }).filter(p => status === 'available' ? p.remainingAmount > 0.001 : true);

    return NextResponse.json(paymentsWithBalance);

  } catch (error) {
    const idFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la récupération des paiements pour le fournisseur ${idFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les paiements', details: errorMessage }),
      { status: 500 }
    );
  }
}