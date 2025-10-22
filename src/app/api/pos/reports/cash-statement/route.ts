// src/app/api/pos/reports/cash-statement/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CashMovementType, CashRegisterType } from '@prisma/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const caisseIds = searchParams.get('caisseIds')?.split(',');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Les paramètres startDate et endDate sont requis.' }, { status: 400 });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const baseWhereClause = {
      cashRegister: {
        type: CashRegisterType.SALES,
        id: caisseIds && caisseIds.length > 0 ? { in: caisseIds } : undefined,
      },
    };
    
    let openingBalance = 0;
    if (caisseIds && caisseIds.length > 0) {
      const lastClosedSession = await prisma.cashRegisterSession.findFirst({
        where: {
          status: 'CLOSED',
          closedAt: { lt: start },
          cashRegister: {
            id: { in: caisseIds },
            type: CashRegisterType.SALES,
          }
        },
        orderBy: { closedAt: 'desc' },
      });
      openingBalance = lastClosedSession?.closingBalance ?? 0;
    }
    
    const sessionsOpenedInPeriod = await prisma.cashRegisterSession.findMany({
        where: { 
          openedAt: { gte: start, lte: end },
          ...baseWhereClause,
        },
        include: { cashRegister: true, openedByUser: true }
    });

    const payments = await prisma.payment.findMany({
      where: { 
        paymentDate: { gte: start, lte: end }, 
        invoiceId: { not: null },
        cashRegisterSession: {
          ...baseWhereClause
        },
      },
      include: {
        invoice: { include: { order: { include: { company: true, user: true } } } },
        cashRegisterSession: { include: { cashRegister: true } }
      }
    });

    const refunds = await prisma.refund.findMany({
        where: { 
          refundDate: { gte: start, lte: end },
          cashRegisterSession: {
            ...baseWhereClause
          }
        },
        include: {
            returnOrder: { include: { originalOrder: { include: { company: true, user: true } } } },
            cashRegisterSession: { include: { cashRegister: true } }
        }
    });

    const movements = await prisma.cashMovement.findMany({
        where: { 
          createdAt: { gte: start, lte: end },
          session: {
            ...baseWhereClause
          }
        },
        include: { user: true, session: { include: { cashRegister: true } } }
    });

    const transactions = [
      ...sessionsOpenedInPeriod.map(s => ({ date: s.openedAt, type: 'Ouverture de Session', transactionId: s.id.substring(0, 8).toUpperCase(), cashRegister: s.cashRegister.name, user: s.openedByUser.name ?? 'N/A', customer: 'Fonds de caisse initial', paymentMethod: 'SYSTEM', amount: s.openingBalance, })),
      ...payments.map(p => ({ date: p.paymentDate, type: 'Vente', transactionId: p.invoice!.order.id.substring(0, 8).toUpperCase(), cashRegister: p.cashRegisterSession?.cashRegister.name ?? 'N/A', user: p.invoice!.order.user.name ?? 'N/A', customer: p.invoice!.order.company.name, paymentMethod: p.method, amount: p.amount, })),
      ...refunds.map(r => ({ date: r.refundDate, type: 'Remboursement', transactionId: r.returnOrder.originalOrder.id.substring(0, 8).toUpperCase(), cashRegister: r.cashRegisterSession?.cashRegister.name ?? 'N/A', user: r.returnOrder.originalOrder.user.name ?? 'N/A', customer: r.returnOrder.originalOrder.company.name, paymentMethod: r.method, amount: -r.amount, })),
      // ✅ LIGNE CORRIGÉE
      ...movements.map(m => ({ date: m.createdAt, type: `Mouvement: ${m.type}`, transactionId: m.id.substring(0, 8).toUpperCase(), cashRegister: m.session?.cashRegister.name ?? 'N/A', user: m.user.name ?? 'N/A', customer: m.reason, paymentMethod: m.type, amount: m.amount, }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalOpeningFundsInPeriod = sessionsOpenedInPeriod.reduce((sum, s) => sum + s.openingBalance, 0);
    const salesByMethod = payments.reduce((acc, p) => { acc[p.method] = (acc[p.method] || 0) + p.amount; return acc; }, {} as Record<string, number>);
    const totalSales = Object.values(salesByMethod).reduce((sum, val) => sum + val, 0);
    const refundsByMethod = refunds.reduce((acc, r) => { acc[r.method] = (acc[r.method] || 0) + r.amount; return acc; }, {} as Record<string, number>);
    const totalRefunds = Object.values(refundsByMethod).reduce((sum, val) => sum + val, 0);
    
    const totalPayIns = movements.filter(m => m.type === CashMovementType.PAY_IN).reduce((sum, m) => sum + m.amount, 0);
    const totalPayOuts = movements.filter(m => m.type === CashMovementType.PAY_OUT).reduce((sum, m) => sum + m.amount, 0);
    const totalWithdrawals = movements.filter(m => m.type === CashMovementType.WITHDRAWAL).reduce((sum, m) => sum + m.amount, 0);
    const totalTransfersIn = movements.filter(m => m.type === CashMovementType.TRANSFER_IN).reduce((sum, m) => sum + m.amount, 0);
    const totalTransfersOut = movements.filter(m => m.type === CashMovementType.TRANSFER_OUT).reduce((sum, m) => sum + m.amount, 0);
    
    const netCashFlow = totalOpeningFundsInPeriod + totalSales - totalRefunds + totalPayIns + totalPayOuts + totalWithdrawals + totalTransfersIn + totalTransfersOut;
    const closingBalance = openingBalance + netCashFlow;

    return NextResponse.json({
      transactions,
      summary: {
        openingBalance, totalOpeningFundsInPeriod, totalSales, salesByMethod,
        totalRefunds, refundsByMethod, totalPayIns, totalPayOuts: Math.abs(totalPayOuts),
        totalWithdrawals: Math.abs(totalWithdrawals), totalTransfersIn, totalTransfersOut: Math.abs(totalTransfersOut),
        netCashFlow, closingBalance,
      }
    });

  } catch (error) {
    console.error("Erreur lors de la génération du relevé de caisse:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return NextResponse.json({ error: "Impossible de générer le rapport.", details: errorMessage }, { status: 500 });
  }
}