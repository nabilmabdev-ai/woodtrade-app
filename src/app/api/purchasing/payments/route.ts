// src/app/api/purchasing/payments/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierPaymentStatus } from '@prisma/client';

/**
 * Gère la requête GET pour récupérer tous les paiements faits aux fournisseurs.
 * CORRIGÉ : Calcule dynamiquement le montant restant pour chaque paiement.
 */
export async function GET() {
  try {
    const payments = await prisma.supplierPayment.findMany({
      include: {
        supplier: { select: { name: true } },
        // On inclut toujours les allocations pour un calcul fiable
        allocations: true,
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    // FIX APPLIQUÉ : Pour chaque paiement, le montant restant est calculé à la volée
    // en se basant sur la somme des allocations. Cela garantit que la donnée est toujours
    // à jour et évite les problèmes de désynchronisation.
    const paymentsWithRemainingAmount = payments.map(p => {
        const allocatedAmount = p.allocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
        const remainingAmount = p.amount - allocatedAmount;
        return {
            ...p,
            remainingAmount, // On ajoute la propriété calculée à l'objet retourné
        };
    });

    return NextResponse.json(paymentsWithRemainingAmount);
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
        status: SupplierPaymentStatus.AVAILABLE, // The payment is available to be allocated to an invoice
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