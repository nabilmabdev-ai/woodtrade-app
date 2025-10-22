// src/app/api/cash-register-sessions/[id]/movements/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CashMovementType } from '@prisma/client';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await context.params;
    const movements = await prisma.cashMovement.findMany({
      where: {
        sessionId: sessionId,
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(movements);
  } catch (error) {
    const sessionIdFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la récupération des mouvements pour la session ${sessionIdFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: "Impossible de récupérer les mouvements.", details: errorMessage }),
      { status: 500 }
    );
  }
}

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
    const { amount, type, reason } = body as {
      amount: number;
      type: CashMovementType;
      reason: string;
    };

    if (!amount || !type || !reason) {
      return new NextResponse(
        JSON.stringify({ error: "Données manquantes : amount, type et reason sont requis." }),
        { status: 400 }
      );
    }

    const amountFloat = parseFloat(amount as unknown as string);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      return new NextResponse(
        JSON.stringify({ error: "Le montant doit être un nombre strictement positif." }),
        { status: 400 }
      );
    }

    if (!Object.values(CashMovementType).includes(type)) {
      return new NextResponse(
        JSON.stringify({ error: `Le type de mouvement '${type}' n'est pas valide.` }),
        { status: 400 }
      );
    }
    
    const finalAmount = (type === CashMovementType.PAY_OUT || type === CashMovementType.WITHDRAWAL) 
      ? -amountFloat 
      : amountFloat;

    const newMovement = await prisma.cashMovement.create({
      data: {
        sessionId,
        userId: session.user.id,
        amount: finalAmount,
        type,
        reason,
      },
    });

    return NextResponse.json(newMovement, { status: 201 });

  } catch (error) {
    const sessionIdFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la création d'un mouvement pour la session ${sessionIdFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: "Impossible de créer le mouvement.", details: errorMessage }),
      { status: 500 }
    );
  }
}