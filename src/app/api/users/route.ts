// src/app/api/users/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { backendPermissionsMap } from '@/lib/permissions-map';
import { authorize } from '@/lib/authorize';

// This is the critical line that fixes the issue.
// It forces this route to run in the Node.js environment, ensuring cookie handling is reliable.
export const runtime = "nodejs";

const ALLOWED_ROLES = backendPermissionsMap['/users']['GET'];

export async function GET() {
  console.log("[API /users] GET request received."); 
  
  try {
    // With the runtime set to 'nodejs', this authorize() call will now succeed.
    await authorize(ALLOWED_ROLES, 'GET /users');

    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(users);

  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      // This is now the expected path for unauthorized users, not a bug.
      return new NextResponse(error.message, { status: error.message === 'UNAUTHORIZED' ? 401 : 403 });
    }
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return new NextResponse(
      JSON.stringify({ error: "Une erreur interne est survenue." }),
      { status: 500 }
    );
  }
}