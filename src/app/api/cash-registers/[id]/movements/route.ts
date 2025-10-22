// src/app/api/cash-registers/[id]/movements/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CashMovementType, CashRegisterType } from '@prisma/client';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Gère la requête GET pour récupérer les mouvements d'une caisse de DÉPENSES
 * pour une période donnée (par défaut le mois en cours).
 * 
 * NOTE : Cet endpoint est conçu pour les caisses SANS session.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cashRegisterId } = await context.params;

    // Pour l'instant, on récupère les mouvements du mois en cours.
    // Plus tard, on pourra ajouter un filtre par période (mois/année) via les searchParams.
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const movements = await prisma.cashMovement.findMany({
      where: {
        // IMPORTANT: On filtre par l'ID de la caisse, pas par l'ID de session.
        cashRegisterId: cashRegisterId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
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
    const id = (await context.params)?.id || 'inconnu';
    console.error(`Erreur lors de la récupération des mouvements pour la caisse de dépenses ${id}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: "Impossible de récupérer les mouvements.", details: errorMessage }),
      { status: 500 }
    );
  }
}


/**
 * Gère la requête POST pour créer un nouveau mouvement pour une caisse de DÉPENSES.
 * 
 * NOTE : Cet endpoint est conçu pour les caisses SANS session.
 * PRÉ-REQUIS: Le schéma Prisma a été mis à jour. Le champ 'sessionId' sur CashMovement
 * est maintenant optionnel, et un champ optionnel 'cashRegisterId' a été ajouté.
 */
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
    const { id: cashRegisterId } = await context.params;
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
    
    // Vérifier que la caisse cible est bien une caisse de dépenses
    const cashRegister = await prisma.cashRegister.findUnique({ where: { id: cashRegisterId } });
    if (!cashRegister) {
        return new NextResponse(JSON.stringify({ error: "Caisse introuvable." }), { status: 404 });
    }
    if (cashRegister.type !== CashRegisterType.EXPENSE) {
        return new NextResponse(JSON.stringify({ error: "Cette action n'est autorisée que pour les caisses de type Dépenses." }), { status: 403 });
    }

    const amountFloat = parseFloat(amount as unknown as string);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      return new NextResponse(
        JSON.stringify({ error: "Le montant doit être un nombre strictement positif." }),
        { status: 400 }
      );
    }

    // Seuls les PAY_IN et PAY_OUT sont logiques pour une caisse de dépenses simple
    if (type !== CashMovementType.PAY_IN && type !== CashMovementType.PAY_OUT) {
      return new NextResponse(
        JSON.stringify({ error: `Le type de mouvement '${type}' n'est pas valide pour une caisse de dépenses.` }),
        { status: 400 }
      );
    }
    
    const finalAmount = (type === CashMovementType.PAY_OUT) ? -amountFloat : amountFloat;

    const newMovement = await prisma.cashMovement.create({
      data: {
        // On lie le mouvement directement à la caisse, pas à une session
        cashRegisterId: cashRegisterId, 
        userId: session.user.id,
        amount: finalAmount,
        type,
        reason,
      },
    });

    return NextResponse.json(newMovement, { status: 201 });

  } catch (error) {
    const id = (await context.params)?.id || 'inconnu';
    console.error(`Erreur lors de la création d'un mouvement pour la caisse de dépenses ${id}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: "Impossible de créer le mouvement.", details: errorMessage }),
      { status: 500 }
    );
  }
}