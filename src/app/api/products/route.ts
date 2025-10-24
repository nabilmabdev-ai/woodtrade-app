// src/app/api/products/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Gère la requête GET pour récupérer tous les produits.
 * (Cette fonction reste inchangée).
 */
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: true,
      },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les produits', details: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Gère la requête POST pour créer un nouveau produit.
 *
 * ✅ GESTION D'ERREUR AMÉLIORÉE :
 * Intercepte spécifiquement l'erreur de contrainte unique de Prisma (P2002)
 * pour renvoyer une réponse 409 Conflict claire si le SKU existe déjà.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sku, name, description, family, collection } = body;

    if (!sku || !name) {
      return new NextResponse(
        JSON.stringify({ error: 'Le SKU et le nom sont requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const newProduct = await prisma.product.create({
      data: { sku, name, description, family, collection },
    });

    return NextResponse.json(newProduct, { status: 201 });

  } catch (error) {
    console.error('Erreur lors de la création du produit:', error);
    
    // --- ✅ FIX APPLIED HERE ---
    // This block specifically checks for the Prisma error code for a unique constraint violation.
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        return new NextResponse(
            JSON.stringify({ error: 'Un produit avec ce SKU existe déjà' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } } // 409 = Conflict
          );
    }

    // Fallback for any other errors.
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de créer le produit', details: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
