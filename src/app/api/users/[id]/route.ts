// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

/**
 * 🔹 GET /api/users/[id]
 * Récupère un utilisateur par ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // ✅ Compatible Next.js 15
) {
  try {
    const { id } = await context.params; // ✅ Await requis
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
 * Met à jour le rôle d’un utilisateur
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // ✅ Compatible Next.js 15
) {
  try {
    const { id } = await context.params; // ✅ Await requis
    const body = await request.json();
    const { role } = body as { role: Role };

    // Validation du champ "role"
    if (!role) {
      return NextResponse.json(
        { error: "Le nouveau rôle est requis." },
        { status: 400 }
      );
    }

    const validRoles = Object.values(Role);
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Le rôle '${role}' n'est pas valide.` },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
    });

    return NextResponse.json(updatedUser);
  } catch (error: unknown) { // ✅ Correction ESLint: "no-explicit-any"
    console.error("❌ Erreur lors de la mise à jour de l'utilisateur :", error);

    // Gestion d'erreur Prisma
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé." },
        { status: 404 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Erreur interne.";
    return NextResponse.json(
      {
        error: "Impossible de mettre à jour l'utilisateur.",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
