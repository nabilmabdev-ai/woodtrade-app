import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Gère la requête GET pour récupérer tous les produits.
 * Le 'family' et 'collection' sont automatiquement inclus car ce sont des champs standards.
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
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Gère la requête POST pour créer un nouveau produit.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // --- LIGNE MODIFIÉE ---
    const { sku, name, description, family, collection } = body;

    if (!sku || !name) {
      return new NextResponse(
        JSON.stringify({ error: 'Le SKU et le nom sont requis' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const newProduct = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        // --- LIGNES AJOUTÉES ---
        family,
        collection,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création du produit:', error);
    
    // Gère le cas où le SKU existe déjà (contrainte unique)
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        return new NextResponse(
            JSON.stringify({ error: 'Un produit avec ce SKU existe déjà' }),
            {
              status: 409, // 409 = Conflict
              headers: { 'Content-Type': 'application/json' },
            }
          );
    }

    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de créer le produit', details: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}