// src/app/api/purchasing/invoices/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierInvoiceStatus, Prisma } from '@prisma/client';

// The GET function remains unchanged.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const whereClause: Prisma.SupplierInvoiceWhereInput = {};
  if (status && Object.values(SupplierInvoiceStatus).includes(status as SupplierInvoiceStatus)) {
    whereClause.status = status as SupplierInvoiceStatus;
  }
  try {
    const invoices = await prisma.supplierInvoice.findMany({
      where: whereClause,
      include: { supplier: { select: { name: true } } },
      orderBy: { invoiceDate: 'desc' },
    });
    const formattedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      supplierName: invoice.supplier.name,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      total: invoice.total,
    }));
    return NextResponse.json(formattedInvoices);
  } catch (error) {
    console.error('Erreur lors de la récupération des factures fournisseurs:', error);
    return new NextResponse(JSON.stringify({ error: 'Impossible de récupérer les factures fournisseurs' }), { status: 500 });
  }
}

// --- MODIFIED POST FUNCTION ---
interface InvoiceLineData {
    productVariantId: string;
    quantity: number;
    unitPrice: number; // This is the cost price
}

/**
 * Gère la requête POST pour créer une nouvelle facture fournisseur avec des lignes de produits.
 */
export async function POST(request: Request) {
    try {
      const body = await request.json();
      const { supplierId, invoiceNumber, invoiceDate, dueDate, lines } = body as {
        supplierId: string;
        invoiceNumber?: string;
        invoiceDate: string;
        dueDate: string;
        lines: InvoiceLineData[];
      };
  
      // --- Validation des données ---
      if (!supplierId || !invoiceDate || !dueDate || !lines || lines.length === 0) {
        return new NextResponse(
          JSON.stringify({ error: 'Données manquantes : supplierId, dates, et au moins une ligne de produit sont requis.' }),
          { status: 400 }
        );
      }

      // --- Calcul des totaux à partir des lignes ---
      const subtotal = lines.reduce((acc, line) => {
        const lineTotal = line.quantity * line.unitPrice;
        return acc + lineTotal;
      }, 0);
      // Pour l'instant, total = subtotal. On pourrait ajouter des taxes/frais plus tard.
      const total = subtotal;

      const newInvoice = await prisma.supplierInvoice.create({
        data: {
          supplierId,
          invoiceNumber,
          invoiceDate: new Date(invoiceDate),
          dueDate: new Date(dueDate),
          subtotal,
          total,
          status: SupplierInvoiceStatus.UNPAID,
          // Création imbriquée des lignes de facture
          lines: {
            create: lines.map(line => ({
              productVariantId: line.productVariantId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              totalPrice: line.quantity * line.unitPrice,
              receivedQuantity: 0, // Rien n'a été reçu à la création
            })),
          },
        },
        include: {
            lines: true, // Inclure les lignes dans la réponse
        }
      });
  
      return NextResponse.json(newInvoice, { status: 201 });
  
    } catch (error) {
      console.error("Erreur lors de la création de la facture fournisseur:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
      return new NextResponse(
        JSON.stringify({ error: "Impossible de créer la facture fournisseur.", details: errorMessage }),
        { status: 500 }
      );
    }
  }
