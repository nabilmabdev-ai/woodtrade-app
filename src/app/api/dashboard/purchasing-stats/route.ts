// src/app/api/dashboard/purchasing-stats/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierInvoiceStatus } from '@prisma/client';

/**
 * Gère la requête GET pour récupérer les statistiques d'achats pour le tableau de bord.
 * - Calcule le montant total des factures fournisseurs en retard.
 * - Calcule le montant total dû pour les factures fournisseurs arrivant à échéance cette semaine.
 */
export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // S'assurer que la comparaison se fait au début de la journée

    // --- 1. Calculer le montant total des factures en retard (Overdue) ---
    const overdueInvoices = await prisma.supplierInvoice.findMany({
      where: {
        status: { in: [SupplierInvoiceStatus.UNPAID, SupplierInvoiceStatus.PARTIALLY_PAID] },
        dueDate: { lt: today }, // lt = less than (antérieur à aujourd'hui)
      },
      include: {
        allocations: true, // On a besoin des allocations pour calculer le solde restant
      },
    });

    let overdueAmount = 0;
    for (const invoice of overdueInvoices) {
      const totalAllocated = invoice.allocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
      const remainingDue = invoice.total - totalAllocated;
      overdueAmount += remainingDue;
    }

    // --- 2. Calculer le montant total dû cette semaine (Due This Week) ---
    const startOfWeek = new Date(today);
    // Note : getDay() retourne 0 pour Dimanche, 1 pour Lundi, etc.
    // On ajuste pour que Lundi (1) soit le début de la semaine. Si c'est Dimanche (0), on recule de 6 jours.
    const dayOfWeek = today.getDay();
    const difference = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(today.getDate() + difference);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999); // Fin de journée du dernier jour de la semaine

    const dueThisWeekInvoices = await prisma.supplierInvoice.findMany({
      where: {
        status: { in: [SupplierInvoiceStatus.UNPAID, SupplierInvoiceStatus.PARTIALLY_PAID] },
        dueDate: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
      include: {
        allocations: true,
      },
    });

    let dueThisWeekAmount = 0;
    for (const invoice of dueThisWeekInvoices) {
      const totalAllocated = invoice.allocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
      const remainingDue = invoice.total - totalAllocated;
      dueThisWeekAmount += remainingDue;
    }

    // --- 3. Combiner les statistiques et répondre ---
    const stats = {
      overdueAmount,
      dueThisWeekAmount,
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Erreur lors de la récupération des stats achats pour le dashboard:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de charger les statistiques d\'achats' }),
      { status: 500 }
    );
  }
}