// src/app/api/cash-registers/[id]/close-session/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { authorize } from '@/lib/authorize';

/**
 * Gère la requête POST pour fermer une session de caisse.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const allowedRoles: Role[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'];
    const user = await authorize(allowedRoles);

    const { id: sessionId } = params;
    const body = await request.json();
    const { closingBalance } = body as {
      closingBalance: number;
    };

    if (!closingBalance) {
      return new NextResponse(
        JSON.stringify({ error: 'Données de clôture de session incomplètes ou invalides.' }),
        { status: 400 }
      );
    }

    const closedSession = await prisma.cashRegisterSession.update({
      where: { id: sessionId },
      data: {
        closingBalance,
        closedAt: new Date(),
        closedByUserId: user.id,
        status: 'CLOSED',
      },
    });

    return NextResponse.json(closedSession, { status: 200 });

  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return new NextResponse(error.message, { status: error.message === 'UNAUTHORIZED' ? 401 : 403 });
    }
    console.error('Erreur lors de la clôture de la session:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de fermer la session', details: errorMessage }),
      { status: 500 }
    );
  }
}
