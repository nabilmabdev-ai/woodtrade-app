// src/app/api/purchasing/payments/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierPaymentStatus } from '@prisma/client';

/**
 * Gère la requête GET pour récupérer tous les paiements faits aux fournisseurs.
 *
 * ✅ ROBUSTESSE APPLIQUÉE : Calcule dynamiquement le `remainingAmount` pour chaque
 * paiement au lieu de se fier à une valeur stockée potentiellement obsolète.
 * Ceci garantit que les données retournées sont toujours exactes.
 */
export async function GET() {
  try {
    const payments = await prisma.supplierPayment.findMany({
      include: {
        supplier: { select: { name: true } },
        // On inclut toujours les allocations car elles sont la source de vérité pour le calcul.
        allocations: true,
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    // Pour chaque paiement, le montant restant est calculé à la volée.
    const paymentsWithCalculatedRemainingAmount = payments.map(p => {
        // La somme des allocations est la source de vérité pour le montant utilisé.
        const allocatedAmount = p.allocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
        const remainingAmount = p.amount - allocatedAmount;
        
        // On peut retourner l'objet original et y ajouter la propriété calculée.
        return {
            ...p,
            remainingAmount, // Cette valeur écrase toute valeur potentiellement stockée et obsolète.
        };
    });

    return NextResponse.json(paymentsWithCalculatedRemainingAmount);
  } catch (error) {
    console.error('Erreur lors de la récupération des paiements fournisseurs:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les paiements fournisseurs', details: errorMessage }),
      { status: 500 }
    );
  }
}

/**
 * Gère la requête POST pour enregistrer manuellement un nouveau paiement à un fournisseur.
 * (Cette fonction reste inchangée mais est correcte dans sa conception).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { supplierId, amount, paymentDate, method } = body as {
      supplierId: string;
      amount: number;
      paymentDate: string;
      method: string;
    };

    if (!supplierId || !amount || amount <= 0 || !paymentDate || !method) {
      return new NextResponse(
        JSON.stringify({ error: 'Données de paiement incomplètes ou invalides.' }),
        { status: 400 }
      );
    }

    const newPayment = await prisma.supplierPayment.create({
      data: {
        supplierId,
        amount,
        paymentDate: new Date(paymentDate),
        method,
        status: SupplierPaymentStatus.AVAILABLE, // Correctly initialized as available.
      },
    });

    return NextResponse.json(newPayment, { status: 201 });

  } catch (error) {
    console.error('Erreur lors de la création du paiement fournisseur:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de créer le paiement fournisseur', details: errorMessage }),
      { status: 500 }
    );
  }
}
