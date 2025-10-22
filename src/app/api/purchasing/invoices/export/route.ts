// src/app/api/purchasing/invoices/export/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// L'import 'SupplierInvoiceStatus' n'est pas utilisé, nous pouvons le supprimer.

// Helper function to escape CSV fields
// CORRECTION: Remplacement de 'any' par un type plus spécifique.
const escapeCsvField = (field: string | number | null | undefined): string => {
    if (field === null || field === undefined) {
        return '';
    }
    const stringField = String(field);
    if (/[",\n\r]/.test(stringField)) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
};

/**
 * Gère la requête GET pour exporter les factures fournisseurs en format CSV.
 */
export async function GET() {
  try {
    const invoices = await prisma.supplierInvoice.findMany({
      include: {
        supplier: { select: { name: true } },
        allocations: true,
      },
      orderBy: {
        invoiceDate: 'desc',
      },
    });

    const headers = [ 'ID Facture', 'Fournisseur', 'Date Facture', 'Date Échéance', 'Statut', 'Total', 'Montant Payé', 'Solde Restant' ];
    const csvRows = [headers.join(',')];

    for (const invoice of invoices) {
      const totalAllocated = invoice.allocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
      const remainingDue = invoice.total - totalAllocated;

      const row = [
        invoice.id,
        invoice.supplier.name,
        new Date(invoice.invoiceDate).toLocaleDateString('fr-FR'),
        new Date(invoice.dueDate).toLocaleDateString('fr-FR'),
        invoice.status,
        invoice.total.toFixed(2),
        totalAllocated.toFixed(2),
        remainingDue.toFixed(2),
      ].map(escapeCsvField);

      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="export_factures_fournisseurs_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Erreur lors de l\'export CSV des factures fournisseurs:', error);
    return new NextResponse( JSON.stringify({ error: 'Impossible de générer le fichier CSV' }), { status: 500 });
  }
}