// src/app/api/suppliers/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // ✅ Importation nécessaire pour les types de filtres

/**
 * Gère la requête GET pour récupérer les fournisseurs, avec une option de recherche.
 *
 * ✅ AMÉLIORATION : La fonction accepte désormais un paramètre de recherche `q`
 * pour filtrer les résultats par nom de fournisseur ou nom de contact, rendant l'API
 * plus flexible et performante pour les interfaces avec recherche.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q'); // 'q' pour "query"

  try {
    const whereClause: Prisma.SupplierWhereInput = {};

    // Si un terme de recherche est fourni, on construit la clause de filtre complexe.
    if (query) {
      whereClause.OR = [
        // Chercher dans le nom du fournisseur
        {
          name: {
            contains: query,
            mode: 'insensitive', // Ignore la casse
          },
        },
        // Ou chercher dans le prénom ou le nom de l'un de ses contacts
        {
          contacts: {
            some: {
              OR: [
                {
                  firstName: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
        },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where: whereClause, // On applique le filtre (vide si pas de query)
      include: {
        contacts: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(suppliers);

  } catch (error) {
    console.error('Erreur lors de la récupération des fournisseurs:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les fournisseurs', details: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Gère la requête POST pour créer un nouveau fournisseur.
 * (Cette fonction reste inchangée mais est correcte).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, vat, category, firstName, lastName, email, phone } = body;

    if (!name || !firstName || !lastName) {
      return new NextResponse(
        JSON.stringify({ error: 'Le nom du fournisseur et le nom/prénom du contact sont requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const newSupplierWithContact = await prisma.supplier.create({
      data: {
        name,
        vat,
        category,
        contacts: { create: { firstName, lastName, email, phone } },
      },
      include: { contacts: true },
    });

    return NextResponse.json(newSupplierWithContact, { status: 201 });

  } catch (error) {
    console.error('Erreur lors de la création du fournisseur:', error);
    
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        return new NextResponse(
            JSON.stringify({ error: 'Un fournisseur avec ce nom existe déjà' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
    }

    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de créer le fournisseur', details: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}