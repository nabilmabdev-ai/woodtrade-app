import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// ✅ NOUVEAU : Importer le type depuis Prisma Client
import { CashRegisterType } from '@prisma/client';

/**
 * Gère la requête GET pour récupérer toutes les caisses enregistreuses.
 * La nouvelle propriété 'type' sera automatiquement incluse.
 */
export async function GET() {
  try {
    const cashRegisters = await prisma.cashRegister.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(cashRegisters);
  } catch (error) {
    console.error('Erreur lors de la récupération des caisses:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les caisses', details: errorMessage }),
      { status: 500 }
    );
  }
}

/**
 * Gère la requête POST pour créer une nouvelle caisse enregistreuse.
 * ✅ MODIFIÉ : Accepte et valide le nouveau champ 'type'.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // ✅ MODIFIÉ : On récupère le 'type' depuis le corps de la requête.
    const { name, location, type } = body as { name: string, location?: string, type: CashRegisterType };

    if (!name || !type) {
      return new NextResponse(
        JSON.stringify({ error: 'Le nom et le type de la caisse sont requis' }),
        { status: 400 }
      );
    }
    
    // ✅ NOUVEAU : Validation pour s'assurer que le type est correct.
    if (!Object.values(CashRegisterType).includes(type)) {
        return new NextResponse(
            JSON.stringify({ error: `Le type de caisse '${type}' n'est pas valide.` }),
            { status: 400 }
        );
    }

    const newCashRegister = await prisma.cashRegister.create({
      data: {
        name,
        location,
        type, // ✅ On sauvegarde le type en base de données.
      },
    });

    return NextResponse.json(newCashRegister, { status: 201 });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return new NextResponse(
        JSON.stringify({ error: 'Une caisse avec ce nom existe déjà' }),
        { status: 409 }
      );
    }

    console.error('Erreur lors de la création de la caisse:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de créer la caisse', details: errorMessage }),
      { status: 500 }
    );
  }
}