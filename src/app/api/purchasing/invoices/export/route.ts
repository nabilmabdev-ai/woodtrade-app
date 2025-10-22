// src/app/api/purchasing/invoices/export/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to correctly escape fields for CSV format.
const escapeCsvField = (field: string | number | null | undefined): string => {
    if (field === null || field === undefined) {
        return '';
    }
    const stringField = String(field);
    // If the field contains a comma, quote, or newline, it must be enclosed in double quotes.
    if (/[",\n\r]/.test(stringField)) {
        // Any double quote inside the field must be escaped by another double quote.
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

    // Define CSV headers
    const headers = [ 'ID Facture', 'Fournisseur', 'Date Facture', 'Date Échéance', 'Statut', 'Total', 'Montant Payé', 'Solde Restant' ];
    const csvRows = [headers.join(',')];

    // Process each invoice into a CSV row
    for (const invoice of invoices) {
      const totalAllocated = invoice.allocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
      const remainingDue = invoice.total - totalAllocated;

      const row = [
        invoice.id,
        invoice.supplier.name,
        // --- ✅ FIX APPLIED HERE ---
        // Corrected the typo from 'toLocaleDateDateString' to 'toLocaleDateString'.
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

    // Return the CSV content as a downloadable file
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