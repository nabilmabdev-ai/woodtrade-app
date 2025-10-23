
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CashRegisterSessionStatus, Role } from '@prisma/client';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { backendPermissionsMap } from '@/lib/permissions-map';
import { authorize } from '@/lib/authorize';

const ALLOWED_ROLES = backendPermissionsMap['/cash-register-sessions']['POST'];

// The GET function for checking active sessions remains unchanged.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cashRegisterId = searchParams.get('cashRegisterId');

  if (!cashRegisterId) {
    return new NextResponse(
      JSON.stringify({ error: "Le paramètre 'cashRegisterId' est manquant." }),
      { status: 400 }
    );
  }

  try {
    const openSession = await prisma.cashRegisterSession.findFirst({
      where: {
        cashRegisterId: cashRegisterId,
        status: CashRegisterSessionStatus.OPEN,
      },
      include: {
        openedByUser: {
          select: { name: true, email: true, }
        }
      }
    });

    if (!openSession) {
      return NextResponse.json(null);
    }
    
    return NextResponse.json(openSession);

  } catch (error) {
    console.error("Erreur lors de la recherche de session ouverte:", error);
    return new NextResponse(
      JSON.stringify({ error: "Impossible de vérifier la session." }),
      { status: 500 }
    );
  }
}


/**
 * Gère la requête POST pour ouvrir une nouvelle session de caisse.
 *
 * ✅ SÉCURITÉ ET ROBUSTESSE APPLIQUÉES :
 * 1.  Utilise la session Supabase pour identifier l'utilisateur de manière sécurisée.
 * 2.  Vérifie que l'utilisateur a un rôle autorisé (caissier ou plus).
 * 3.  Implémente une logique "upsert" pour garantir que l'utilisateur existe dans la BDD locale.
 * 4.  Empêche l'ouverture d'une session si une autre est déjà active sur la même caisse.
 */
export async function POST(request: Request) {
  try {
    const user = await authorize(ALLOWED_ROLES, 'POST /cash-register-sessions');
    
    // 3. Proceed with the business logic for opening the session.
    const body = await request.json();
    const { cashRegisterId, openingBalance } = body;

    if (!cashRegisterId || openingBalance === undefined) {
      return new NextResponse(JSON.stringify({ error: 'Données manquantes: cashRegisterId et openingBalance sont requis.' }), { status: 400 });
    }

    const balance = parseFloat(openingBalance);
    if (isNaN(balance) || balance < 0) {
      return new NextResponse(JSON.stringify({ error: 'Le fonds de caisse doit être un nombre positif.' }), { status: 400 });
    }
    
    // Check for existing open sessions on the same register to prevent duplicates.
    const existingOpenSession = await prisma.cashRegisterSession.findFirst({
        where: { cashRegisterId: cashRegisterId, status: CashRegisterSessionStatus.OPEN }
    });

    if (existingOpenSession) {
        return new NextResponse(
            JSON.stringify({ error: 'Cette caisse a déjà une session ouverte. Veuillez la fermer avant d\'en ouvrir une nouvelle.' }),
            { status: 409 } // 409 Conflict
        );
    }

    // Create the session using the authenticated user's ID.
    const newSession = await prisma.cashRegisterSession.create({
      data: {
        cashRegisterId,
        openingBalance: balance,
        openedByUserId: user.id,
        status: CashRegisterSessionStatus.OPEN,
      },
    });

    return NextResponse.json(newSession, { status: 201 });

  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return new NextResponse(error.message, { status: error.message === 'UNAUTHORIZED' ? 401 : 403 });
    }
    console.error("Erreur lors de l'ouverture de la session de caisse:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(JSON.stringify({ error: "Impossible d'ouvrir la session de caisse.", details: errorMessage }), { status: 500 });
  }
}
