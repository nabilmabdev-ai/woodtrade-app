import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    const updatedContact = await prisma.contact.update({
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
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return new NextResponse(
        JSON.stringify({ error: 'Contact non trouvé.' }),
        { status: 404 }
      );
    }
    console.error('Erreur lors de la mise à jour du contact:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de mettre à jour le contact.', details: errorMessage }),
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string, contactId: string }> }
) {
  try {
    const { contactId } = await context.params;

    await prisma.contact.delete({
      where: { id: contactId },
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === 'P2025') {
          return new NextResponse(
            JSON.stringify({ error: 'Contact non trouvé.' }),
            { status: 404 }
          );
      }
      if (prismaError.code === 'P2003') {
          return new NextResponse(
            JSON.stringify({ error: 'Ce contact ne peut pas être supprimé car il est associé à une ou plusieurs commandes.' }),
            { status: 409 }
          );
      }
    }
    console.error('Erreur lors de la suppression du contact:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de supprimer le contact.', details: errorMessage }),
      { status: 500 }
    );
  }
}