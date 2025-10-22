// src/app/api/customers/[id]/credit-notes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreditNoteStatus } from '@prisma/client';

/**
 * Gère la requête GET pour récupérer tous les avoirs d'un client spécifique.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await context.params;

    if (!companyId) {
      return new NextResponse(JSON.stringify({ error: "L'ID du client est manquant." }), { status: 400 });
    }

    const creditNotes = await prisma.creditNote.findMany({
      where: {
        companyId: companyId,
      },
      // On trie pour voir les plus récents ou ceux encore disponibles en premier
      orderBy: [
        { status: 'asc' }, // AVAILABLE, PARTIALLY_USED, puis FULLY_USED
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(creditNotes);

  } catch (error) {
    const idFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la récupération des avoirs pour le client ${idFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les avoirs', details: errorMessage }),
      { status: 500 }
    );
  }
}

/**
 * Gère la requête POST pour créer manuellement un avoir pour un client (ex: geste commercial).
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: companyId } = await context.params;
        const body = await request.json();
        const { amount, reason } = body as { amount: number; reason: string };

        if (!companyId) {
            return new NextResponse(JSON.stringify({ error: "L'ID du client est manquant." }), { status: 400 });
        }
        if (!amount || amount <= 0 || !reason) {
            return new NextResponse(JSON.stringify({ error: 'Un montant valide et une raison sont requis.' }), { status: 400 });
        }

        const newCreditNote = await prisma.creditNote.create({
            data: {
                companyId: companyId,
                initialAmount: amount,
                remainingAmount: amount,
                reason: reason,
                status: CreditNoteStatus.AVAILABLE,
            }
        });

        return NextResponse.json(newCreditNote, { status: 201 });

    } catch (error) {
        const idFromContext = context.params ? (await context.params).id : 'inconnu';
        console.error(`Erreur lors de la création manuelle de l'avoir pour le client ${idFromContext}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
        return new NextResponse(
          JSON.stringify({ error: "Impossible de créer l'avoir", details: errorMessage }),
          { status: 500 }
        );
    }
}