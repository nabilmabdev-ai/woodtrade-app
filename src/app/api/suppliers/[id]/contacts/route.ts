// src/app/api/suppliers/[id]/contacts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Gère la requête POST pour créer un nouveau contact pour un fournisseur spécifique.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplierId } = await context.params;
    const body = await request.json();
    const { firstName, lastName, email, phone } = body;

    if (!firstName || !lastName) {
      return new NextResponse(
        JSON.stringify({ error: 'Le prénom et le nom sont requis.' }),
        { status: 400 }
      );
    }

    // Vérifier que le fournisseur parent existe
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
        return new NextResponse(
            JSON.stringify({ error: "Le fournisseur parent est introuvable." }),
            { status: 404 }
        );
    }

    const newContact = await prisma.supplierContact.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        supplierId: supplierId,
      },
    });

    return NextResponse.json(newContact, { status: 201 });

  } catch (error) {
    console.error('Erreur lors de la création du contact fournisseur:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de créer le contact.' }),
      { status: 500 }
    );
  }
}