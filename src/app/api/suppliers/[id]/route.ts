// src/app/api/suppliers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supplier = await prisma.supplier.findUnique({
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

    if (!supplier) {
      return new NextResponse(
        JSON.stringify({ error: 'Fournisseur non trouvé' }),
        { status: 404 }
      );
    }

    return NextResponse.json(supplier);
  } catch (error) {
    const idFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la récupération du fournisseur ${idFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer le fournisseur', details: errorMessage }),
      { status: 500 }
    );
  }
}