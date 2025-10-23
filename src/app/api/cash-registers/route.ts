
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CashRegisterType, CashRegisterSessionStatus, Prisma, Role } from '@prisma/client';
import { authorize } from '@/lib/authorize';
import { backendPermissionsMap } from '@/lib/permissions-map';

const POST_ALLOWED_ROLES = backendPermissionsMap['/cash-registers']['POST'];

/**
 * Gère la requête GET pour récupérer les caisses enregistreuses,
 * avec support pour la pagination, la recherche et le filtrage par type.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // --- NEW: Retrieve query parameters for filtering and pagination ---
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type');

  try {
    const where: Prisma.CashRegisterWhereInput = {};

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (type && Object.values(CashRegisterType).includes(type as CashRegisterType)) {
      where.type = type as CashRegisterType;
    }
    
    // Fetch registers and total count in parallel for efficiency
    const [cashRegisters, total] = await prisma.$transaction([
        prisma.cashRegister.findMany({
            where,
            orderBy: { name: 'asc' },
            take: limit,
            skip: offset,
        }),
        prisma.cashRegister.count({ where }),
    ]);

    const registersWithDetails = await Promise.all(
      cashRegisters.map(async (register) => {
        // This logic remains the same: calculate balance and find active session
        const balanceResult = await prisma.cashMovement.aggregate({
          where: {
            OR: [
              { cashRegisterId: register.id },
              { session: { cashRegisterId: register.id } },
            ],
          },
          _sum: { amount: true },
        });
        const currentBalance = balanceResult._sum.amount || 0;

        let activeSession = null;
        if (register.type === 'SALES') {
           activeSession = await prisma.cashRegisterSession.findFirst({
            where: {
              cashRegisterId: register.id,
              status: CashRegisterSessionStatus.OPEN,
            },
            include: {
              openedByUser: { select: { name: true, email: true } },
            },
          });
        }
        
        return {
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
      })
    );
    
    // Return data with pagination metadata
    return NextResponse.json({
        data: registersWithDetails,
        meta: {
            limit,
            offset,
            total,
        },
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des caisses:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les caisses', details: errorMessage }),
      { status: 500 }
    );
  }
}


/**
 * Gère la requête POST pour créer une nouvelle caisse enregistreuse.
 * ✅ SÉCURITÉ APPLIQUÉE : Seuls les admins et super-admins peuvent créer une caisse.
 */
export async function POST(request: Request) {
  try {
    await authorize(POST_ALLOWED_ROLES, 'POST /cash-registers');

    const body = await request.json();
    const { name, location, type } = body as { name: string, location?: string, type: CashRegisterType };

    if (!name || !type) {
      return new NextResponse(JSON.stringify({ error: 'Le nom et le type sont requis' }), { status: 400 });
    }
    
    if (!Object.values(CashRegisterType).includes(type)) {
        return new NextResponse(JSON.stringify({ error: `Le type '${type}' n'est pas valide.` }), { status: 400 });
    }

    const newCashRegister = await prisma.cashRegister.create({
      data: { name, location, type },
    });

    return NextResponse.json(newCashRegister, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return new NextResponse(error.message, { status: error.message === 'UNAUTHORIZED' ? 401 : 403 });
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return new NextResponse(JSON.stringify({ error: 'Une caisse avec ce nom existe déjà' }), { status: 409 });
    }
    console.error('Erreur lors de la création de la caisse:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(JSON.stringify({ error: 'Impossible de créer la caisse', details: errorMessage }), { status: 500 });
  }
}
