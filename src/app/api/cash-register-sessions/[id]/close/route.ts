// src/app/api/cash-register-sessions/[id]/close/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CashRegisterSessionStatus } from '@prisma/client';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return new NextResponse(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  try {
    const { id: sessionId } = await context.params;

    const body = await request.json();
    const { closingBalance } = body as {
      closingBalance: number;
    };

    if (closingBalance === undefined) {
      return new NextResponse(
        JSON.stringify({ error: 'Le montant de clôture est requis.' }),
        { status: 400 }
      );
    }

    const countedAmount = parseFloat(closingBalance as unknown as string);
    if (isNaN(countedAmount) || countedAmount < 0) {
      return new NextResponse(
        JSON.stringify({ error: 'Le montant de clôture doit être un nombre positif.' }),
        { status: 400 }
      );
    }
    
    const closedSession = await prisma.$transaction(async (tx) => {
      const sessionToClose = await tx.cashRegisterSession.findUnique({
        where: { id: sessionId },
      });

      if (!sessionToClose) {
        throw new Error('Session non trouvée.');
      }
      if (sessionToClose.status === CashRegisterSessionStatus.CLOSED) {
        throw new Error('Cette session est déjà fermée.');
      }

      const cashPayments = await tx.payment.aggregate({
        where: { cashRegisterSessionId: sessionId, method: 'CASH' },
        _sum: { amount: true },
      });
      const totalCashSales = cashPayments._sum.amount || 0;

      const cashMovements = await tx.cashMovement.aggregate({
        where: { sessionId: sessionId },
        _sum: { amount: true },
      });
      const totalCashMovements = cashMovements._sum.amount || 0;

      const cashRefunds = await tx.refund.aggregate({
        where: { cashRegisterSessionId: sessionId, method: 'CASH' },
        _sum: { amount: true },
      });
      const totalCashRefunds = cashRefunds._sum.amount || 0;

      const expectedBalance = 
          sessionToClose.openingBalance +
          totalCashSales +
          totalCashMovements -
          totalCashRefunds;

      const difference = countedAmount - expectedBalance;

      const updatedSession = await tx.cashRegisterSession.update({
        where: { id: sessionId },
        data: {
          status: CashRegisterSessionStatus.CLOSED,
          closingBalance: countedAmount,
          expectedBalance: expectedBalance,
          difference: difference,
          closedAt: new Date(),
          closedByUserId: session.user.id,
        },
      });

      return updatedSession;
    });

    return NextResponse.json(closedSession, { status: 200 });

  } catch (error) {
    const sessionIdFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la fermeture de la session ${sessionIdFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Impossible de fermer la session.";
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    );
  }
}