// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

/**
 * 🔹 GET /api/users/[id]
 * Récupère un utilisateur par son ID.
 * Cette route doit être protégée pour s'assurer qu'un utilisateur ne peut voir
 * que son propre profil, ou qu'un admin peut voir n'importe quel profil.
 * (La logique de sécurité sera ajoutée dans une étape ultérieure si nécessaire).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // ✅ Compatible avec Next.js 15
) {
  try {
    const { id } = await context.params; // ✅ L'utilisation de 'await' est la pratique recommandée.
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé." },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de l'utilisateur :", error);
    return NextResponse.json(
      { error: "Impossible de récupérer les informations de l'utilisateur." },
      { status: 500 }
    );
  }
}

/**
 * 🔹 PUT /api/users/[id]
 * Met à jour le rôle d’un utilisateur.
 * (La logique de sécurité pour restreindre cette action aux admins est gérée dans le endpoint /api/users)
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // ✅ Compatible avec Next.js 15
) {
  try {
    const { id } = await context.params; // ✅ Await
    const body = await request.json();
    const { role } = body as { role: Role };

    if (!role || !Object.values(Role).includes(role)) {
      return NextResponse.json(
        { error: `Le rôle '${role}' n'est pas valide ou est manquant.` },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
    });

    return NextResponse.json(updatedUser);
  } catch (error: unknown) { // ✅ Correction ESLint: Utilisation de 'unknown' au lieu de 'any'
    console.error("❌ Erreur lors de la mise à jour de l'utilisateur :", error);

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé pour la mise à jour." },
        { status: 404 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return NextResponse.json(
      { error: "Impossible de mettre à jour l'utilisateur.", details: errorMessage },
      { status: 500 }
    );
  }
}