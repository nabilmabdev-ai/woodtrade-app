// src/app/api/cash-registers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CashRegisterType, CashRegisterSessionStatus } from '@prisma/client';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const register = await prisma.cashRegister.findUnique({
      where: { id: id },
    });

    if (!register) {
      return new NextResponse(
        JSON.stringify({ error: 'Register not found' }),
        { status: 404 }
      );
    }
    
    // --- NEW LOGIC TO MATCH FRONTEND EXPECTATIONS ---

    // 1. Calculate the current balance by aggregating all related movements.
    const balanceResult = await prisma.cashMovement.aggregate({
      where: {
        OR: [
          { cashRegisterId: register.id },
          { session: { cashRegisterId: register.id } },
        ],
      },
      _sum: {
        amount: true,
      },
    });
    const currentBalance = balanceResult._sum.amount || 0;

    // 2. Find the active session for this register, if it's a SALES register.
    let activeSession = null;
    if (register.type === CashRegisterType.SALES) {
       activeSession = await prisma.cashRegisterSession.findFirst({
        where: {
          cashRegisterId: register.id,
          status: CashRegisterSessionStatus.OPEN,
        },
        include: {
          openedByUser: {
            select: { name: true, email: true },
          },
        },
      });
    }

    // 3. Construct the detailed response object the frontend page expects.
    const registerDetails = {
      id: register.id,
      name: register.name,
      type: register.type,
      currentBalance: currentBalance,
      session: activeSession ? {
        id: activeSession.id,
        openingBalance: activeSession.openingBalance,
        openedBy: activeSession.openedByUser,
        openedAt: activeSession.openedAt.toISOString(),
      } : null,
    };
    
    return NextResponse.json(registerDetails);

  } catch (error) {
    const idFromContext = context.params ? (await context.params).id : 'unknown';
    console.error(`Error fetching register details for ${idFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Internal error.";
    return new NextResponse(
      JSON.stringify({ error: 'Failed to retrieve register details', details: errorMessage }),
      { status: 500 }
    );
  }
}