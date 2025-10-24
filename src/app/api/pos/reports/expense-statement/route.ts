// src/app/api/pos/reports/expense-statement/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CashRegisterType } from '@prisma/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month'); // 1-indexed (1 for January)
  const cashRegisterId = searchParams.get('cashRegisterId');

  if (!year || !month || !cashRegisterId) {
    return NextResponse.json({ error: 'Les paramètres year, month, et cashRegisterId sont requis.' }, { status: 400 });
  }

  try {
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    // Date range for the selected month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

    // --- 1. Security Check: Ensure it's an EXPENSE register ---
    const register = await prisma.cashRegister.findUnique({
      where: { id: cashRegisterId },
    });
    if (!register || register.type !== CashRegisterType.EXPENSE) {
      return NextResponse.json({ error: "Cette caisse n'est pas une caisse de dépenses." }, { status: 403 });
    }

    // --- 2. Calculate Opening Balance ---
    // Sum of all movements *before* the start of the selected month.
    const openingBalanceResult = await prisma.cashMovement.aggregate({
      where: {
        cashRegisterId: cashRegisterId,
        createdAt: {
          lt: startDate, // Less than the first day of the month
        },
      },
      _sum: {
        amount: true,
      },
    });
    const openingBalance = openingBalanceResult._sum.amount || 0;

    // --- 3. Fetch all movements for the selected month ---
    const movementsInPeriod = await prisma.cashMovement.findMany({
      where: {
        cashRegisterId: cashRegisterId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // --- 4. Calculate Summary Statistics ---
    let runningBalance = openingBalance;
    const transactions = movementsInPeriod.map(m => {
      runningBalance += m.amount;
      return {
        id: m.id,
        date: m.createdAt,
        reason: m.reason,
        user: m.user.name || m.user.email,
        amount: m.amount,
        runningBalance: runningBalance,
      };
    });

    const totalPayIns = movementsInPeriod
      .filter(m => m.amount > 0)
      .reduce((sum, m) => sum + m.amount, 0);

    const totalPayOuts = movementsInPeriod
      .filter(m => m.amount < 0)
      .reduce((sum, m) => sum + m.amount, 0);

    const closingBalance = openingBalance + totalPayIns + totalPayOuts;

    return NextResponse.json({
      transactions,
      summary: {
        openingBalance,
        totalPayIns,
        totalPayOuts: Math.abs(totalPayOuts),
        netChange: totalPayIns + totalPayOuts,
        closingBalance,
      }
    });

  } catch (error) {
    console.error("Erreur lors de la génération du relevé de dépenses:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return NextResponse.json({ error: "Impossible de générer le rapport.", details: errorMessage }, { status: 500 });
  }
}
