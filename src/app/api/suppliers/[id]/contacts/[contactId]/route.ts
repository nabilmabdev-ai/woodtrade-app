// src/app/api/suppliers/[id]/contacts/[contactId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Gère la requête PUT pour mettre à jour un contact fournisseur spécifique.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string, contactId: string }> }
) {
  try {
    const { contactId } = await context.params;
    const body = await request.json();
    const { firstName, lastName, email, phone } = body;

    if (!firstName || !lastName) {
      return new NextResponse(
        JSON.stringify({ error: 'Le prénom et le nom sont requis.' }),
        { status: 400 }
      );
    }

    const updatedContact = await prisma.supplierContact.update({
      where: { id: contactId },
      data: {
        firstName,
        lastName,
        email,
        phone,
      },
    });

    return NextResponse.json(updatedContact);

  } catch (error) {
    // Gère le cas où le contact n'est pas trouvé
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return new NextResponse(
        JSON.stringify({ error: 'Contact non trouvé.' }),
        { status: 404 }
      );
    }
    console.error('Erreur lors de la mise à jour du contact fournisseur:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de mettre à jour le contact.', details: errorMessage }),
      { status: 500 }
    );
  }
}

/**
 * Gère la requête DELETE pour supprimer un contact fournisseur spécifique.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string, contactId: string }> }
) {
  try {
    const { contactId } = await context.params;

    await prisma.supplierContact.delete({
      where: { id: contactId },
    });

    // Pas de contenu à retourner pour une suppression réussie
    return new NextResponse(null, { status: 204 });

  } catch (error) {
     // Gère le cas où le contact n'est pas trouvé
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
        return new NextResponse(
          JSON.stringify({ error: 'Contact non trouvé.' }),
          { status: 404 }
        );
    }
    console.error('Erreur lors de la suppression du contact fournisseur:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de supprimer le contact.', details: errorMessage }),
      { status: 500 }
    );
  }
}