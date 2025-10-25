// src/app/api/cash-register-sessions/[id]/close/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CashRegisterSessionStatus, Role, CashMovementType } from '@prisma/client';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Gère la requête POST pour fermer une session de caisse.
 * SÉCURITÉ APPLIQUÉE : Seuls les utilisateurs autorisés peuvent fermer une session.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            async get(name: string) {
              const cookieStore = await cookies();
              return cookieStore.get(name)?.value
            },
            async set(name: string, value: string, options: CookieOptions) {
              try {
                const cookieStore = await cookies();
                cookieStore.set({ name, value, ...options })
              } catch {}
            },
            async remove(name: string, options: CookieOptions) {
              try {
                const cookieStore = await cookies();
                cookieStore.set({ name, value: '', ...options })
              } catch {}
            },
          },
        }
    );

  // Define roles that are allowed to close a session
  const ALLOWED_ROLES: Role[] = [Role.CASHIER, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN];

  try {
    // 1. Authenticate the user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
    }

    // 2. Authorize the user based on their role
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return new NextResponse(JSON.stringify({ error: 'Accès refusé. Permissions insuffisantes.' }), { status: 403 });
    }

    // 3. If authorized, proceed with the business logic
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

      // If there is a difference and the user wants to create an adjustment
      if (Math.abs(difference) >= 0.01 && createAdjustment) {
        // The amount of the movement is the inverse of the difference to balance the register.
        const adjustmentAmount = -difference;

        await tx.cashMovement.create({
            data: {
                sessionId: sessionId,
                userId: session.user.id,
                amount: adjustmentAmount,
                type: adjustmentAmount > 0 ? CashMovementType.ADJUSTMENT : CashMovementType.ADJUSTMENT,
                reason: `Ajustement de clôture (Écart de ${difference.toFixed(2)} MAD)`,
            }
        });
      }

      return updatedSession;
    });

    return NextResponse.json(closedSession, { status: 200 });

  } catch (err) {
    const sessionIdFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la fermeture de la session ${sessionIdFromContext}:`, err);
    const errorMessage = err instanceof Error ? err.message : "Impossible de fermer la session.";
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    );
  }
}