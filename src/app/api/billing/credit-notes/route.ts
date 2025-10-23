
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { authorize } from '@/lib/authorize';
import { backendPermissionsMap } from '@/lib/permissions-map';

const GET_ALLOWED_ROLES = backendPermissionsMap['/billing/credit-notes']['GET'];
const POST_ALLOWED_ROLES = backendPermissionsMap['/billing/credit-notes']['POST'];

/**
 * Gère la requête GET pour récupérer tous les avoirs.
 */
export async function GET() {
  try {
    await authorize(GET_ALLOWED_ROLES, 'GET /billing/credit-notes');

    const creditNotes = await prisma.creditNote.findMany({
      include: {
        company: {
          select: { name: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(creditNotes);

  } catch (error) {
    console.error('Erreur lors de la récupération des avoirs:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les avoirs', details: errorMessage }),
      { status: 500 }
    );
  }
}

/**
 * Gère la requête POST pour créer un nouvel avoir.
 */
export async function POST(request: Request) {
  try {
    await authorize(POST_ALLOWED_ROLES, 'POST /billing/credit-notes');

    const body = await request.json();
    const { companyId, amount, reason, date } = body as {
      companyId: string;
      amount: number;
      reason: string;
      date: string;
    };

    if (!companyId || !amount || amount <= 0 || !reason || !date) {
      return new NextResponse(
        JSON.stringify({ error: 'Données de l\'avoir incomplètes ou invalides.' }),
        { status: 400 }
      );
    }

    const newCreditNote = await prisma.creditNote.create({
      data: {
        companyId,
        amount,
        reason,
        date: new Date(date),
      },
    });

    return NextResponse.json(newCreditNote, { status: 201 });

  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return new NextResponse(error.message, { status: error.message === 'UNAUTHORIZED' ? 401 : 403 });
    }
    console.error('Erreur lors de la création de l\'avoir:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de créer l\'avoir', details: errorMessage }),
      { status: 500 }
    );
  }
}
