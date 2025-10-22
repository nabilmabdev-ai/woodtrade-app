// src/app/api/invoices/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// CORRECTION : Importer Prisma et InvoiceStatus pour les types
import { InvoiceStatus, Prisma } from '@prisma/client';

/**
 * Gère la requête GET pour récupérer toutes les factures, avec un filtre de statut optionnel.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  // CORRECTION : Utiliser 'const' et le type Prisma approprié
  const whereClause: Prisma.InvoiceWhereInput = {};

  // Vérifier si le statut fourni est une valeur valide de l'enum InvoiceStatus
  if (status && Object.values(InvoiceStatus).includes(status as InvoiceStatus)) {
    whereClause.status = status as InvoiceStatus;
  }

  try {
    const invoices = await prisma.invoice.findMany({
      where: whereClause, // Appliquer le filtre ici
      include: {
        order: {
          include: {
            company: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        issueDate: 'desc', // Les plus récentes en premier
      },
    });

    // On transforme les données pour un affichage plus simple sur le front-end
    const formattedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      orderId: invoice.orderId,
      status: invoice.status,
      total: invoice.total,
      issueDate: invoice.issueDate,
      companyName: invoice.order.company.name,
    }));

    return NextResponse.json(formattedInvoices);

  } catch (error) {
    console.error('Erreur lors de la récupération des factures:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les factures' }),
      { status: 500 }
    );
  }
}