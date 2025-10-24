// src/app/api/cash-registers/[id]/close-session/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// ✅ CORRECTION : L'importation de 'Role' n'est plus nécessaire ici.
import { authorize } from '@/lib/authorize';
import { backendPermissionsMap } from '@/lib/permissions-map';

const ALLOWED_ROLES = backendPermissionsMap['/cash-registers/[id]/close-session']['POST'];

/**
 * Gère la requête POST pour fermer une session de caisse.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authorize(ALLOWED_ROLES, 'POST /cash-registers/[id]/close-session');

    const { id: sessionId } = await context.params;
    const body = await request.json();
    const { closingBalance } = body as {
      closingBalance: number;
    };

    if (closingBalance === undefined) {
      return new NextResponse(
        JSON.stringify({ error: 'Le montant de clôture est requis.' }),
        { status: 400 }
      );
    }

    const closedSession = await prisma.cashRegisterSession.update({
      where: { id: sessionId },
      data: {
        closingBalance,
        closedAt: new Date(),
        closedByUserId: user.id,
        status: 'CLOSED',
      },
    });

    return NextResponse.json(closedSession, { status: 200 });

  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return new NextResponse(error.message, { status: error.message === 'UNAUTHORIZED' ? 401 : 403 });
    }
    
    const idFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la clôture de la session ${idFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de fermer la session', details: errorMessage }),
      { status: 500 }
    );
  }
}