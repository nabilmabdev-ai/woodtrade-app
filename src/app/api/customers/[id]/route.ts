// src/app/api/customers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const company = await prisma.company.findUnique({
      where: {
        id: id,
      },
      include: {
        contacts: {
          orderBy: {
            lastName: 'asc',
          },
        },
      },
    });

    if (!company) {
      return new NextResponse(
        JSON.stringify({ error: 'Client non trouvé' }),
        { status: 404 }
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    const idFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la récupération du client ${idFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer le client', details: errorMessage }),
      { status: 500 }
    );
  }
}