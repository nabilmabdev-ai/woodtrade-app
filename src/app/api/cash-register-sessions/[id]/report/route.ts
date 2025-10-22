// src/app/api/cash-register-sessions/[id]/report/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Payment, Refund, CashMovementType } from '@prisma/client';

function aggregateByMethod<T extends Payment | Refund>(items: T[]) {
  const summary = items.reduce((acc, item) => {
    if (!acc[item.method]) {
      acc[item.method] = { total: 0, count: 0 };
    }
    acc[item.method].total += item.amount;
    acc[item.method].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  return Object.entries(summary).map(([method, data]) => ({ method, ...data }));
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await context.params;

    const session = await prisma.cashRegisterSession.findUnique({
      where: { id: sessionId },
      include: {
        payments: true,
        refunds: true,
        // --- CORRECTION APPLIED HERE ---
        // The relation is named 'cashMovements', not 'movements'.
        cashMovements: true,
        openedByUser: { select: { name: true, email: true } },
        closedByUser: { select: { name: true, email: true } },
        cashRegister: { select: { name: true } },
      },
    });

    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Session non trouvée' }), { status: 404 });
    }
    
    const salesSummary = aggregateByMethod(session.payments);
    const totalSales = salesSummary.reduce((acc, s) => acc + s.total, 0);
    const transactionCount = new Set(session.payments.map(p => p.invoiceId)).size;

    const refundsSummary = aggregateByMethod(session.refunds);
    const totalRefunds = refundsSummary.reduce((acc, r) => acc + r.total, 0);

    const payIns = session.cashMovements
      .filter(m => m.type === CashMovementType.PAY_IN)
      .reduce((acc, m) => acc + m.amount, 0);
    const payOuts = session.cashMovements
      .filter(m => m.type === CashMovementType.PAY_OUT)
      .reduce((acc, m) => acc + m.amount, 0);
    const withdrawals = session.cashMovements
      .filter(m => m.type === CashMovementType.WITHDRAWAL)
      .reduce((acc, m) => acc + m.amount, 0);

    const report = {
      sessionId: session.id,
      cashRegisterName: session.cashRegister.name,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openedBy: session.openedByUser.name || session.openedByUser.email,
      closedBy: session.closedByUser?.name || session.closedByUser?.email,
      sales: {
        summary: salesSummary,
        totalSales: totalSales,
        transactionCount: transactionCount,
      },
      refunds: {
        summary: refundsSummary,
        totalRefunds: totalRefunds,
      },
      cashMovements: {
        payIns,
        payOuts: Math.abs(payOuts),
        withdrawals: Math.abs(withdrawals),
      },
      finalBalance: {
        openingBalance: session.openingBalance,
        expectedBalance: session.expectedBalance,
        closingBalance: session.closingBalance,
        difference: session.difference,
      },
    };

    return NextResponse.json(report);

  } catch (error) {
    const sessionIdFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la génération du rapport pour la session ${sessionIdFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: "Impossible de générer le rapport.", details: errorMessage }),
      { status: 500 }
    );
  }
}