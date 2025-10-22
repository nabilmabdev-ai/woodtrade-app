// src/app/api/invoices/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Gère la requête GET pour récupérer les détails complets d'une facture spécifique.
 *
 * ✅ CORRECTION APPLIQUÉE :
 * La requête inclut maintenant explicitement `creditNoteAllocations` en plus des `paymentAllocations`.
 * Cela garantit que le solde de la facture est calculé correctement côté client,
 * en tenant compte de tous les types de paiements (directs et via avoirs).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            company: true,
            contact: true,
            lines: {
              include: {
                productVariant: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        },
        // On récupère les deux types d'allocations pour un calcul de solde complet.
        paymentAllocations: {
            include: {
                payment: true // Inclure les détails du paiement pour l'affichage
            }
        },
        // --- ✅ FIX APPLIED HERE ---
        creditNoteAllocations: {
            include: {
                creditNote: true // Inclure les détails de l'avoir pour l'affichage
            }
        },
      },
    });

    if (!invoice) {
      return new NextResponse(JSON.stringify({ error: 'Facture non trouvée' }), { status: 404 });
    }

    // Le calcul du solde restant est fait côté client (dans InvoiceDetailPage),
    // mais maintenant il a toutes les données nécessaires pour le faire correctement.
    return NextResponse.json(invoice);

  } catch (error) {
    const idFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la récupération de la facture ${idFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(JSON.stringify({ error: 'Impossible de récupérer la facture', details: errorMessage }), { status: 500 });
  }
}