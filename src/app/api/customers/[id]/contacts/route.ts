import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await context.params;
    const body = await request.json();
    const { firstName, lastName, email, phone } = body;

    if (!firstName || !lastName) {
      return new NextResponse(
        JSON.stringify({ error: 'Le prénom et le nom sont requis.' }),
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
        return new NextResponse(
            JSON.stringify({ error: "L'entreprise parente est introuvable." }),
            { status: 404 }
        );
    }

    const newContact = await prisma.contact.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        companyId: companyId,
      },
    });

    return NextResponse.json(newContact, { status: 201 });

  } catch (error) {
    console.error('Erreur lors de la création du contact:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de créer le contact.' }),
      { status: 500 }
    );
  }
}