// src/app/api/cash-register-sessions/history/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CashRegisterSessionStatus, CashRegisterType } from '@prisma/client';

/**
 * Gère la requête GET pour récupérer l'historique de toutes les sessions de caisse FERMÉES.
 * ✅ MODIFIÉ : Assure que seules les sessions des caisses de VENTE sont retournées et 
 * inclut le type de la caisse dans la réponse.
 */
export async function GET() {
  try {
    const closedSessions = await prisma.cashRegisterSession.findMany({
      where: {
        status: CashRegisterSessionStatus.CLOSED,
        // ✅ NOUVEAU : Ajout d'une condition pour ne récupérer que les sessions des caisses de type SALES.
        // C'est une sécurité supplémentaire pour s'assurer que la logique est respectée.
        cashRegister: {
          type: CashRegisterType.SALES,
        },
      },
      // Inclure les informations des entités liées pour un affichage complet
      include: {
        cashRegister: {
          select: {
            name: true,
            // ✅ MODIFIÉ : On inclut explicitement le type de la caisse dans la réponse.
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
      // Trier par date de fermeture, les plus récentes en premier
      orderBy: {
        closedAt: 'desc',
      },
    });

    return NextResponse.json(closedSessions);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique des sessions:", error);
    return new NextResponse(
      JSON.stringify({ error: "Impossible de récupérer l'historique des sessions." }),
      { status: 500 }
    );
  }
}