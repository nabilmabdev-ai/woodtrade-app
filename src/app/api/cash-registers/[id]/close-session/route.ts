// src/app/api/cash-registers/[id]/close-session/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CashRegisterSessionStatus, Role, CashMovementType } from '@prisma/client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Gère la requête POST pour fermer une session de caisse.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    // CORRECT, ASYNCHRONOUS SUPABASE CLIENT
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            async get(name: string) {
              const cookieStore = await cookies();
              return cookieStore.get(name)?.value
            },
            async set(name: string, value: string, options) {
              const cookieStore = await cookies();
              cookieStore.set({ name, value, ...options });
            },
            async remove(name: string, options) {
              const cookieStore = await cookies();
              cookieStore.set({ name, value: '', ...options });
            },
          },
        }
    );

  const ALLOWED_ROLES: Role[] = [Role.CASHIER, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN];

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return new NextResponse(JSON.stringify({ error: 'Accès refusé. Permissions insuffisantes.' }), { status: 403 });
    }

    const { id: sessionId } = await context.params;
    const body = await request.json();
    const { closingBalance, createAdjustment } = body as {
      closingBalance: number;
      createAdjustment: boolean;
    };

    if (closingBalance === undefined) {
      return new NextResponse(JSON.stringify({ error: 'Le montant de clôture est requis.' }), { status: 400 });
    }

    const countedAmount = parseFloat(closingBalance as unknown as string);
    if (isNaN(countedAmount) || countedAmount < 0) {
      return new NextResponse(JSON.stringify({ error: 'Le montant de clôture doit être un nombre positif.' }), { status: 400 });
    }
    
    const closedSession = await prisma.$transaction(async (tx) => {
      const sessionToClose = await tx.cashRegisterSession.findUnique({
        where: { id: sessionId },
        include: { cashRegister: true }
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

      if (Math.abs(difference) >= 0.01 && createAdjustment) {
        const adjustmentAmount = -difference;

        await tx.cashMovement.create({
            data: {
                sessionId: sessionId,
                userId: session.user.id,
                amount: adjustmentAmount,
                type: CashMovementType.ADJUSTMENT,
                reason: `Ajustement de clôture (Écart de ${difference.toFixed(2)} MAD)`,
            }
        });
      }

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