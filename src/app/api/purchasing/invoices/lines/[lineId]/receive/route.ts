// src/app/api/purchasing/invoices/lines/[lineId]/receive/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Gère la requête POST pour enregistrer la réception de marchandises
 * pour une ligne de facture fournisseur spécifique.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ lineId: string }> }
) {
  try {
    const { lineId } = await context.params;
    const body = await request.json();
    const { quantityToReceive, location } = body as { quantityToReceive: number; location?: string; };

    if (!quantityToReceive || quantityToReceive <= 0) {
      return new NextResponse(JSON.stringify({ error: "La quantité à réceptionner doit être un nombre positif." }), { status: 400 });
    }

    const updatedLine = await prisma.$transaction(async (tx) => {
      // 1. Récupérer la ligne de facture et valider la quantité
      const line = await tx.supplierInvoiceLine.findUniqueOrThrow({
        where: { id: lineId },
        include: { invoice: true }, // Inclure la facture pour le numéro de référence
      });

      const remainingToReceive = line.quantity - line.receivedQuantity;
      if (quantityToReceive > remainingToReceive + 0.001) { // Tolérance pour les erreurs de floating point
        throw new Error(`La quantité à réceptionner (${quantityToReceive}) dépasse la quantité restante (${remainingToReceive}).`);
      }

      // 2. Mettre à jour la quantité reçue sur la ligne de facture
      const updatedInvoiceLine = await tx.supplierInvoiceLine.update({
        where: { id: lineId },
        data: {
          receivedQuantity: {
            increment: quantityToReceive,
          },
        },
      });

      // 3. Mettre à jour l'inventaire
      const inventory = await tx.inventory.findFirst({
        where: { productVariantId: line.productVariantId },
      });

      let updatedInventory;
      if (inventory) {
        // Le stock pour cette variante existe, on l'incrémente
        updatedInventory = await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: {
              increment: quantityToReceive,
            },
          },
        });
      } else {
        // Le stock n'existe pas, on le crée
        updatedInventory = await tx.inventory.create({
          data: {
            productVariantId: line.productVariantId,
            quantity: quantityToReceive,
            location: location || 'Default',
          },
        });
      }

      // 4. Créer un mouvement de stock pour la traçabilité
      await tx.inventoryMovement.create({
        data: {
          inventoryId: updatedInventory.id,
          quantity: quantityToReceive,
          type: 'PURCHASE',
          reason: `Réception facture fournisseur #${line.invoice.invoiceNumber || line.invoiceId.substring(0,8)}`,
        },
      });

      return updatedInvoiceLine;
    });

    return NextResponse.json(updatedLine, { status: 200 });

  } catch (error) {
    console.error("Erreur lors de la réception des marchandises:", error);
    const errorMessage = error instanceof Error ? error.message : "Impossible de traiter la requête.";
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    );
  }
}