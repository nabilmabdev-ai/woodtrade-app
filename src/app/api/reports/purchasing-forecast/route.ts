// src/app/api/reports/purchasing-forecast/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierInvoiceStatus } from '@prisma/client';

// Helper function to get the start of the week (Monday) for a given date
function getStartOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(date.setDate(diff));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Les paramètres startDate et endDate sont requis.' }, { status: 400 });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 1. Fetch all invoices that are not fully paid and fall within the date range
    const invoicesToPay = await prisma.supplierInvoice.findMany({
      where: {
        status: { in: [SupplierInvoiceStatus.UNPAID, SupplierInvoiceStatus.PARTIALLY_PAID] },
        dueDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        allocations: true,
      },
    });

    // 2. Process the data to create the forecast, grouping by week
    const weeklyForecast = new Map<string, { weekStartDate: Date; amountDue: number }>();

    for (const invoice of invoicesToPay) {
      const totalAllocated = invoice.allocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
      const remainingDue = invoice.total - totalAllocated;

      if (remainingDue > 0) {
        const weekStart = getStartOfWeek(invoice.dueDate);
        const weekKey = weekStart.toISOString().split('T')[0]; // Use YYYY-MM-DD as a key

        if (weeklyForecast.has(weekKey)) {
          weeklyForecast.get(weekKey)!.amountDue += remainingDue;
        } else {
          weeklyForecast.set(weekKey, {
            weekStartDate: weekStart,
            amountDue: remainingDue,
          });
        }
      }
    }

    // 3. Convert the map to a sorted array for the response
    const forecastReport = Array.from(weeklyForecast.values()).sort(
      (a, b) => a.weekStartDate.getTime() - b.weekStartDate.getTime()
    );

    const totalDueInPeriod = forecastReport.reduce((sum, week) => sum + week.amountDue, 0);

    return NextResponse.json({
      totalDueInPeriod,
      weeklyReport: forecastReport,
    });

  } catch (error) {
    console.error("Erreur lors de la génération du prévisionnel d'achats:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return NextResponse.json({ error: "Impossible de générer le rapport.", details: errorMessage }, { status: 500 });
  }
}
