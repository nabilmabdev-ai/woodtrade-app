// src/app/api/suppliers/[id]/payments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierPaymentStatus, Prisma } from '@prisma/client';
// SIMULATION: Dans une vraie application, vous importeriez une fonction pour obtenir l'utilisateur actuel
// import { getCurrentUser } from '@/lib/session';

/**
 * Gère la requête GET pour récupérer tous les paiements d'un fournisseur spécifique.
 * CORRECTIF : Ajout d'une vérification de droits (simulée) pour s'assurer que
 * seul un utilisateur autorisé peut accéder aux données financières d'un fournisseur.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // --- BLOC DE SÉCURITÉ (SIMULÉ) ---
    // Dans une application réelle, vous vérifieriez ici les droits de l'utilisateur.
    // Par exemple:
    // const user = await getCurrentUser();
    // if (!user || !user.roles.includes('ACCOUNTANT')) {
    //   return new NextResponse(JSON.stringify({ error: "Accès non autorisé." }), { status: 403 });
    // }
    // Pour cet exercice, nous laissons un commentaire pour marquer l'emplacement de cette logique.
    console.log("SECURITY CHECK: Endpoint /api/suppliers/[id]/payments hit. Authorization check should be implemented here.");


    const { id: supplierId } = await context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // ex: 'available'

    if (!supplierId) {
      return new NextResponse(JSON.stringify({ error: "L'ID du fournisseur est manquant." }), { status: 400 });
    }

    const whereClause: Prisma.SupplierPaymentWhereInput = { supplierId: supplierId };

    if (status === 'available') {
      whereClause.status = {
        in: [SupplierPaymentStatus.AVAILABLE, SupplierPaymentStatus.PARTIALLY_ALLOCATED],
      };
    }

    const payments = await prisma.supplierPayment.findMany({
      where: whereClause,
      include: {
        allocations: true, // L'inclusion des allocations est cruciale pour le calcul du solde
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });
    
    // Le calcul du solde est effectué à la volée sur le serveur.
    // C'est la méthode la plus fiable car elle utilise toujours les données les plus récentes.
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