import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const cashRegister = await prisma.cashRegister.findUnique({
      where: {
        id: id,
      },
    });

    if (!cashRegister) {
      return new NextResponse(
        JSON.stringify({ error: 'Caisse non trouvée' }),
        { status: 404 }
      );
    }

    return NextResponse.json(cashRegister);
  } catch (error) {
    const idFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la récupération de la caisse ${idFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer la caisse', details: errorMessage }),
      { status: 500 }
    );
  }
}