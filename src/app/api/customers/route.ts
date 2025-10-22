import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      include: {
        contacts: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(companies);
  } catch (error)
 {
    console.error('Erreur lors de la récupération des clients:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les clients', details: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // --- LIGNE MODIFIÉE ---
    const { name, vat, category, firstName, lastName, email, phone } = body;

    if (!name || !firstName || !lastName) {
      return new NextResponse(
        JSON.stringify({ error: 'Le nom de l\'entreprise et le nom/prénom du contact sont requis' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const newCompanyWithContact = await prisma.company.create({
      data: {
        name,
        vat,
        // --- LIGNE AJOUTÉE ---
        category,
        contacts: {
          create: {
            firstName,
            lastName,
            email,
            phone,
          },
        },
      },
      include: {
        contacts: true,
      },
    });

    return NextResponse.json(newCompanyWithContact, { status: 201 });

  } catch (error) {
    console.error('Erreur lors de la création du client:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de créer le client', details: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}