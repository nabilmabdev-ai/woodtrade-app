import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Gère la requête POST pour ajuster la quantité d'un produit en stock.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productVariantId, quantity, reason, location, lotNumber } = body;

    // --- Validation des données ---
    if (!productVariantId || quantity === undefined || !reason) {
      return new NextResponse(
        JSON.stringify({ error: 'Données manquantes : productVariantId, quantity, et reason sont requis.' }),
        { status: 400 }
      );
    }

    const quantityFloat = parseFloat(quantity);
    if (isNaN(quantityFloat)) {
        return new NextResponse(
            JSON.stringify({ error: 'La quantité doit être un nombre.' }),
            { status: 400 }
          );
    }

    // --- Logique de mise à jour dans une transaction ---
    const result = await prisma.$transaction(async (tx) => {
      // 1. Chercher s'il existe déjà une ligne de stock pour cette variante.
      let inventory = await tx.inventory.findFirst({
        where: { productVariantId: productVariantId },
      });

      if (inventory) {
        // 2a. Si elle existe, on met à jour la quantité.
        inventory = await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: {
              increment: quantityFloat,
            },
          },
        });
      } else {
        // 2b. Sinon, on crée une nouvelle ligne de stock.
        if (quantityFloat < 0) {
            throw new Error("Impossible d'avoir une quantité négative pour un nouvel article en stock.");
        }
        inventory = await tx.inventory.create({
          data: {
            productVariantId: productVariantId,
            quantity: quantityFloat,
            location: location,
            lotNumber: lotNumber,
          },
        });
      }

      // 3. Dans tous les cas, on enregistre le mouvement pour la traçabilité.
      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          quantity: quantityFloat,
          type: quantityFloat > 0 ? 'IN' : 'ADJUSTMENT',
          reason: reason,
        },
      });

      return { inventory, movement };
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Erreur lors de l'ajustement de l'inventaire:", error);
    const errorMessage = error instanceof Error ? error.message : "Impossible de traiter l'ajustement";
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    );
  }
}