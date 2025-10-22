// src/app/api/customers/[id]/payments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// ✅ CORRECTION : Importer Prisma et PaymentStatus pour les types
import { PaymentStatus, Prisma } from '@prisma/client';

/**
 * Gère la requête GET pour récupérer tous les paiements d'un client spécifique.
 * Peut être filtré pour ne retourner que les paiements "disponibles" pour une allocation.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // ex: 'available'

    if (!companyId) {
      return new NextResponse(JSON.stringify({ error: "L'ID du client est manquant." }), { status: 400 });
    }

    // ✅ CORRECTION : 'const' est utilisé et le type 'Prisma.PaymentWhereInput' est maintenant reconnu.
    const whereClause: Prisma.PaymentWhereInput = { companyId: companyId };

    // Si le paramètre 'status=available' est présent, on ne retourne que les paiements non entièrement alloués.
    if (status === 'available') {
      whereClause.status = {
        in: [PaymentStatus.AVAILABLE, PaymentStatus.PARTIALLY_ALLOCATED],
      };
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        allocations: true, // On inclut les allocations pour calculer le solde
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });
    
    // Calculer dynamiquement le montant restant pour chaque paiement
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
    console.error(`Erreur lors de la récupération des paiements pour le client ${idFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les paiements', details: errorMessage }),
      { status: 500 }
    );
  }
}