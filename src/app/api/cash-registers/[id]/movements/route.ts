// src/app/api/cash-registers/[id]/movements/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma, CashMovementType } from '@prisma/client';
import { authorize } from '@/lib/authorize';
import { backendPermissionsMap } from '@/lib/permissions-map';

const POST_ALLOWED_ROLES = backendPermissionsMap['/cash-registers/[id]/movements']['POST'];

/**
 * Gère la requête GET pour récupérer les mouvements d'une caisse spécifique,
 * avec des options de pagination, de recherche et de filtrage par date.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cashRegisterId } = await context.params;
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Prisma.CashMovementWhereInput = {
      OR: [
        { cashRegisterId: cashRegisterId },
        { session: { cashRegisterId: cashRegisterId } },
      ],
    };

    if (search) {
      where.AND = [
        ...(where.AND as Prisma.CashMovementWhereInput[] || []),
        {
          OR: [
            { reason: { contains: search, mode: 'insensitive' } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    if (from || to) {
        const dateFilter: { gte?: Date; lte?: Date } = {};
        if (from) dateFilter.gte = new Date(from);
        if (to) {
            const endDate = new Date(to);
            endDate.setHours(23, 59, 59, 999);
            dateFilter.lte = endDate;
        }
        where.AND = [
            ...(where.AND as Prisma.CashMovementWhereInput[] || []),
            { createdAt: dateFilter },
        ];
    }

    const [movements, total] = await prisma.$transaction([
      prisma.cashMovement.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.cashMovement.count({ where }),
    ]);

    return NextResponse.json({
      data: movements,
      meta: { limit, offset, total },
    });

  } catch (error) {
    const id = (await context.params)?.id || 'inconnu';
    console.error(`Erreur lors de la récupération des mouvements pour la caisse ${id}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: "Impossible de récupérer les mouvements.", details: errorMessage }),
      { status: 500 }
    );
  }
}


/**
 * Gère la requête POST pour créer un nouveau mouvement de caisse.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authorize(POST_ALLOWED_ROLES, 'POST /cash-registers/[id]/movements');

    const { id: cashRegisterId } = await context.params;
    const body = await request.json();
    const { amount, type, reason, sessionId } = body as {
      amount: number;
      type: 'IN' | 'OUT'; // Type received from the frontend is a simple string
      reason: string;
      sessionId?: string;
    };

    if (!amount || !type || !reason) {
      return new NextResponse(JSON.stringify({ error: "Données manquantes" }), { status: 400 });
    }
    
    // This block translates the simple string from the frontend ('IN'/'OUT')
    // into the corresponding Prisma enum value that the database expects.
    let movementType: CashMovementType;
    if (type === 'IN') {
      movementType = CashMovementType.PAY_IN;
    } else if (type === 'OUT') {
      movementType = CashMovementType.PAY_OUT;
    } else {
      // If an unexpected value is received, reject the request.
      return new NextResponse(JSON.stringify({ error: `Type de mouvement invalide reçu : '${type}'` }), { status: 400 });
    }

    const amountFloat = parseFloat(amount as unknown as string);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      return new NextResponse(JSON.stringify({ error: "Montant invalide." }), { status: 400 });
    }
    
    // Use the translated `movementType` (the enum) to determine the sign of the amount.
    const finalAmount = (movementType === CashMovementType.PAY_OUT) ? -amountFloat : amountFloat;

    const newMovement = await prisma.cashMovement.create({
      data: {
        sessionId: sessionId,
        cashRegisterId: !sessionId ? cashRegisterId : undefined,
        userId: user.id,
        amount: finalAmount,
        type: movementType, // Pass the correct enum value to Prisma.
        reason,
      },
    });

    return NextResponse.json(newMovement, { status: 201 });

  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return new NextResponse(error.message, { status: error.message === 'UNAUTHORIZED' ? 401 : 403 });
    }
    const id = (await context.params)?.id || 'inconnu';
    console.error(`Erreur lors de la création d'un mouvement pour la caisse ${id}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(JSON.stringify({ error: "Impossible de créer le mouvement.", details: errorMessage }), { status: 500 });
  }
}