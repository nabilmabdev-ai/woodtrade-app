// src/app/api/inventory/adjust/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Role } from '@prisma/client';

// Define the roles that are allowed to perform inventory adjustments.
const ALLOWED_ROLES: Role[] = [Role.WAREHOUSE, Role.ADMIN, Role.SUPER_ADMIN];

/**
 * Gère la requête POST pour ajuster la quantité d'un produit en stock.
 *
 * ✅ SÉCURITÉ APPLIQUÉE : Seuls les utilisateurs avec un rôle autorisé
 * (WAREHOUSE, ADMIN, SUPER_ADMIN) peuvent exécuter cette action.
 */
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // 1. Vérifier la session de l'utilisateur.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Non autorisé.' }), { status: 401 });
    }

    // 2. Récupérer le profil de l'utilisateur pour vérifier son rôle.
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Utilisateur non trouvé.' }), { status: 403 });
    }

    // 3. Appliquer la règle d'accès.
    if (!ALLOWED_ROLES.includes(user.role)) {
      return new NextResponse(JSON.stringify({ error: 'Accès refusé. Permissions insuffisantes.' }), { status: 403 });
    }

    // 4. Si l'utilisateur est autorisé, procéder à la logique métier.
    const body = await request.json();
    const { productVariantId, quantity, reason, location, lotNumber } = body;

    if (!productVariantId || quantity === undefined || !reason) {
      return new NextResponse(JSON.stringify({ error: 'Données manquantes : productVariantId, quantity, et reason sont requis.' }), { status: 400 });
    }

    const quantityFloat = parseFloat(quantity);
    if (isNaN(quantityFloat)) {
      return new NextResponse(JSON.stringify({ error: 'La quantité doit être un nombre.' }), { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let inventory = await tx.inventory.findFirst({
        where: { productVariantId: productVariantId },
      });

      if (inventory) {
        inventory = await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: { increment: quantityFloat } },
        });
      } else {
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

      // Enregistrer le mouvement. Le champ userId a été retiré pour corriger l'erreur de build.
      // NOTE: Pour activer la piste d'audit, ajoutez `userId String` au modèle `InventoryMovement`
      // dans `schema.prisma` et ajoutez la relation, puis décommentez la ligne ci-dessous.
      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          quantity: quantityFloat,
          type: quantityFloat > 0 ? 'IN' : 'ADJUSTMENT',
          reason: reason,
          // userId: session.user.id, // <-- Ligne qui causait l'erreur, maintenant commentée
        },
      });

      return { inventory, movement };
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Erreur lors de l'ajustement de l'inventaire:", error);
    const errorMessage = error instanceof Error ? error.message : "Impossible de traiter l'ajustement";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}