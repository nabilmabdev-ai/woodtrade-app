// src/app/api/users/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { backendPermissionsMap } from '@/lib/permissions-map';
import { authorize } from '@/lib/authorize';

// ✅ THE FIX: Force this route to run in the Node.js runtime.
// This ensures that the Supabase server client can always access request cookies.
export const runtime = "nodejs";

const ALLOWED_ROLES = backendPermissionsMap['/users']['GET'];

export async function GET() {
  // You can keep this log for confirmation after deploying the fix
  console.log("[API /users] GET request received."); 
  
  try {
    // authorize() will now succeed because the runtime is correct
    await authorize(ALLOWED_ROLES, 'GET /users');

    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(users);

  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return new NextResponse(error.message, { status: error.message === 'UNAUTHORIZED' ? 401 : 403 });
    }
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return new NextResponse(
      JSON.stringify({ error: "Une erreur interne est survenue." }),
      { status: 500 }
    );
  }
}