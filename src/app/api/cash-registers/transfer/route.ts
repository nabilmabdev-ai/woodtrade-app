// src/app/api/cash-registers/transfer/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CashMovementType, CashRegisterSessionStatus } from '@prisma/client';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface TransferPayload {
  amount: number;
  reason: string;
  sourceSessionId: string;
  destinationRegisterId: string;
}

/**
 * Gère la requête POST pour transférer des fonds d'une session de caisse active
 * vers une autre caisse ayant également une session active.
 */
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session: authSession } } = await supabase.auth.getSession();

  if (!authSession) {
    return new NextResponse(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  try {
    const body = (await request.json()) as TransferPayload;
    const { amount, reason, sourceSessionId, destinationRegisterId } = body;

    if (!amount || amount <= 0 || !reason || !sourceSessionId || !destinationRegisterId) {
      return new NextResponse(JSON.stringify({ error: 'Données de transfert invalides ou incomplètes.' }), { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const sourceSession = await tx.cashRegisterSession.findUnique({
        where: { id: sourceSessionId },
      });
      if (!sourceSession || sourceSession.status !== CashRegisterSessionStatus.OPEN) {
        throw new Error('La session de caisse source est invalide ou déjà fermée.');
      }

      const destinationSession = await tx.cashRegisterSession.findFirst({
        where: {
          cashRegisterId: destinationRegisterId,
          status: CashRegisterSessionStatus.OPEN,
        },
      });
      if (!destinationSession) {
        throw new Error("La caisse de destination n'a pas de session active. Impossible de recevoir les fonds.");
      }

      if (sourceSession.cashRegisterId === destinationSession.cashRegisterId) {
        throw new Error('Impossible de transférer des fonds vers la même caisse.');
      }
      
      // Créer le mouvement de sortie sur la session source
      const withdrawalMovement = await tx.cashMovement.create({
        data: {
          sessionId: sourceSessionId,
          userId: authSession.user.id,
          amount: -amount,
          type: CashMovementType.TRANSFER_OUT,
          reason: `${reason} (vers caisse #${destinationSession.cashRegisterId.substring(0, 4)})`,
        },
      });

      // Créer le mouvement d'entrée sur la session de destination
      const depositMovement = await tx.cashMovement.create({
        data: {
          sessionId: destinationSession.id,
          userId: authSession.user.id,
          amount: amount,
          type: CashMovementType.TRANSFER_IN,
          reason: `${reason} (de caisse #${sourceSession.cashRegisterId.substring(0, 4)})`,
        },
      });

      return { withdrawalMovement, depositMovement };
    });

    return NextResponse.json({ success: true, ...result }, { status: 200 });

  } catch (error) {
    console.error("Erreur lors du transfert de fonds entre caisses:", error);
    const errorMessage = error instanceof Error ? error.message : "Impossible de traiter la requête.";
    
    if (errorMessage.includes("session") || errorMessage.includes("caisse")) {
        return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 409 });
    }

    return new NextResponse(
      JSON.stringify({ error: "Une erreur interne est survenue lors du transfert." }),
      { status: 500 }
    );
  }
}
