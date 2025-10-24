// src/app/api/cash-register-sessions/history/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CashRegisterSessionStatus, CashRegisterType, Prisma } from '@prisma/client';

/**
 * Gère la requête GET pour récupérer l'historique des sessions de caisse.
 *
 * ✅ MODIFIÉ : Implémente la pagination, la recherche, et le filtrage par date.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // --- NEW: Retrieve query parameters ---
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = (parseInt(searchParams.get('page') || '1', 10) - 1) * limit; // Calculate offset
  const search = searchParams.get('search') || '';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    const whereClause: Prisma.CashRegisterSessionWhereInput = {
      status: CashRegisterSessionStatus.CLOSED,
      cashRegister: {
        type: CashRegisterType.SALES, // Always filter to sales registers
      },
    };

    // --- NEW: Apply search filter ---
    if (search) {
      // ✅ CORRECTION APPLIQUÉE ICI
      // La recherche sur les utilisateurs (nom/email) est maintenant correctement imbriquée.
      whereClause.OR = [
        { cashRegister: { name: { contains: search, mode: 'insensitive' } } },
        { openedByUser: { OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
        ]}},
        { closedByUser: { OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
        ]}},
      ];
    }

    // --- NEW: Apply date filters ---
    if (from || to) {
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) {
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999); // Include the whole day
        dateFilter.lte = endDate;
      }
      whereClause.closedAt = dateFilter;
    }

    // --- NEW: Fetch data and total count in parallel ---
    const [sessions, total] = await prisma.$transaction([
      prisma.cashRegisterSession.findMany({
        where: whereClause,
        include: {
          cashRegister: {
            select: {
              name: true,
              type: true,
            },
          },
          openedByUser: {
            select: {
              name: true,
              email: true,
            },
          },
          closedByUser: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          closedAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.cashRegisterSession.count({ where: whereClause }),
    ]);

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      openingBalance: session.openingBalance,
      closingBalance: session.closingBalance,
      expectedBalance: session.expectedBalance,
      difference: session.difference,
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt?.toISOString() ?? null,
      cashRegister: {
        name: session.cashRegister.name,
        type: session.cashRegister.type,
      },
      openedByUser: {
        name: session.openedByUser?.name || session.openedByUser?.email || 'N/A',
        email: session.openedByUser?.email ?? 'N/A',
      },
      closedByUser: {
        name: session.closedByUser?.name || session.closedByUser?.email || 'N/A',
        email: session.closedByUser?.email ?? 'N/A',
      },
    }));

    return NextResponse.json({
      data: formattedSessions,
      meta: {
        limit,
        offset,
        total,
      },
    });

  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique des sessions:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: "Impossible de récupérer l'historique des sessions.", details: errorMessage }),
      { status: 500 }
    );
  }
}
