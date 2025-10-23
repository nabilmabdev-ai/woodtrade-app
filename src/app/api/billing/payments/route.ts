
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentStatus, Role } from '@prisma/client';
import { authorize } from '@/lib/authorize';
import { backendPermissionsMap } from '@/lib/permissions-map';

const GET_ALLOWED_ROLES = backendPermissionsMap['/billing/payments']['GET'];
const POST_ALLOWED_ROLES = backendPermissionsMap['/billing/payments']['POST'];

/**
 * Gère la requête GET pour récupérer tous les paiements.
 */
export async function GET() {
  try {
    await authorize(GET_ALLOWED_ROLES, 'GET /billing/payments');

    const payments = await prisma.payment.findMany({
      include: {
        company: { select: { name: true } },
        allocations: true,
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    // Calculer le montant restant pour chaque paiement
    const paymentsWithRemainingAmount = payments.map(p => {
        const allocatedAmount = p.allocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
        const remainingAmount = p.amount - allocatedAmount;
        return {
            ...p,
            remainingAmount,
        };
    });

    return NextResponse.json(paymentsWithRemainingAmount);
  } catch (error) {
    console.error('Erreur lors de la récupération des paiements:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les paiements', details: errorMessage }),
      { status: 500 }
    );
  }
}

/**
 * Gère la requête POST pour enregistrer manuellement un nouveau paiement.
 */
export async function POST(request: Request) {
  try {
    await authorize(POST_ALLOWED_ROLES, 'POST /billing/payments');

    const body = await request.json();
    const { companyId, amount, paymentDate, method } = body as {
      companyId: string;
      amount: number;
      paymentDate: string;
      method: string;
    };

    if (!companyId || !amount || amount <= 0 || !paymentDate || !method) {
      return new NextResponse(
        JSON.stringify({ error: 'Données de paiement incomplètes ou invalides.' }),
        { status: 400 }
      );
    }

    const newPayment = await prisma.payment.create({
      data: {
        companyId,
        amount,
        paymentDate: new Date(paymentDate),
        method,
        status: PaymentStatus.AVAILABLE, // Le paiement est disponible pour être alloué
      },
    });

    return NextResponse.json(newPayment, { status: 201 });

  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return new NextResponse(error.message, { status: error.message === 'UNAUTHORIZED' ? 401 : 403 });
    }
    console.error('Erreur lors de la création du paiement:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de créer le paiement', details: errorMessage }),
      { status: 500 }
    );
  }
}
