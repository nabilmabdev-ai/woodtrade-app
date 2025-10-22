// src/app/api/billing/credit-notes/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Gère la requête GET pour récupérer tous les avoirs.
 */
export async function GET() {
  try {
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