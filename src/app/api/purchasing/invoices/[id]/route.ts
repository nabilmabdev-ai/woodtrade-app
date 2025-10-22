// src/app/api/purchasing/invoices/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierInvoiceStatus } from '@prisma/client';


export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const invoice = await prisma.supplierInvoice.findUnique({
      where: { id },
      include: {
        supplier: true,
        allocations: {
          include: {
            payment: true,
          },
          orderBy: {
            payment: {
              paymentDate: 'asc',
            },
          },
        },
        lines: {
            include: {
                productVariant: {
                    include: {
                        product: true,
                    }
                }
            },
            orderBy: {
                id: 'asc'
            }
        }
      },
    });

    if (!invoice) {
      return new NextResponse(JSON.stringify({ error: 'Facture fournisseur non trouvée' }), { status: 404 });
    }

    return NextResponse.json(invoice);

  } catch (error) {
    const idFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la récupération de la facture fournisseur ${idFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(JSON.stringify({ error: 'Impossible de récupérer la facture', details: errorMessage }), { status: 500 });
  }
}

// --- FONCTION PUT MODIFIÉE ---
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const body = await request.json();
        // On ne récupère que les champs modifiables autorisés
        const { invoiceNumber, invoiceDate, dueDate } = body;

        if (!invoiceDate || !dueDate) {
            return new NextResponse(JSON.stringify({ error: 'Les champs invoiceDate et dueDate sont requis.' }), { status: 400 });
        }

        const invoiceToUpdate = await prisma.supplierInvoice.findUnique({ where: { id } });
        if (!invoiceToUpdate) {
            return new NextResponse(JSON.stringify({ error: 'Facture non trouvée.' }), { status: 404 });
        }

        // La logique de protection reste la même
        if (invoiceToUpdate.status === SupplierInvoiceStatus.PAID || invoiceToUpdate.status === SupplierInvoiceStatus.VOID) {
            return new NextResponse(JSON.stringify({ error: `Impossible de modifier une facture avec le statut '${invoiceToUpdate.status}'.` }), { status: 403 });
        }
        
        // La validation du 'total' a été retirée car il n'est plus modifiable

        const updatedInvoice = await prisma.supplierInvoice.update({
            where: { id },
            data: {
                // Seuls ces champs sont mis à jour. Le total et les lignes sont intacts.
                invoiceNumber: invoiceNumber,
                invoiceDate: new Date(invoiceDate),
                dueDate: new Date(dueDate),
            },
        });

        return NextResponse.json(updatedInvoice);

    } catch (error) {
        const idFromContext = context.params ? (await context.params).id : 'inconnu';
        console.error(`Erreur lors de la mise à jour de la facture fournisseur ${idFromContext}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
        return new NextResponse(JSON.stringify({ error: 'Impossible de mettre à jour la facture.', details: errorMessage }), { status: 500 });
    }
}