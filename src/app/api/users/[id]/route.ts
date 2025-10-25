// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Role } from '@prisma/client';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (existing) return NextResponse.json(existing);

    // CORRECT SUPABASE CLIENT FOR ROUTE HANDLERS
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            const cookieStore = await cookies();
            return cookieStore.get(name)?.value;
          },
          async set(name: string, value: string, options: CookieOptions) {
            const cookieStore = await cookies();
            try { cookieStore.set({ name, value, ...options }) } catch (error) {}
          },
          async remove(name: string, options: CookieOptions) {
            const cookieStore = await cookies();
            try { cookieStore.set({ name, value: '', ...options }) } catch (error) {}
          },
        },
      }
    );
    
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: 'Utilisateur non trouvé.' }), { status: 404 });
    }

    if (session.user.id === id) {
      const payload = {
        id: session.user.id,
        email: session.user.email ?? '',
        name: session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? null,
        role: Role.CASHIER, 
      };

      const created = await prisma.user.create({ data: payload });
      return NextResponse.json(created);
    }

    return new NextResponse(JSON.stringify({ error: 'Accès refusé.' }), { status: 403 });
  } catch (err) {
    console.error('[API/users/[id]] error:', err);
    return new NextResponse(JSON.stringify({ error: "Impossible de récupérer l'utilisateur." }), { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { role } = body as { role: Role };

    if (!role || !Object.values(Role).includes(role)) {
      return NextResponse.json({ error: `Le rôle '${role}' n'est pas valide ou est manquant.` }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
    });

    return NextResponse.json(updatedUser);
  } catch (error: unknown) {
    console.error("❌ Erreur lors de la mise à jour de l'utilisateur :", error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: "Utilisateur non trouvé pour la mise à jour." }, { status: 404 });
    }
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return NextResponse.json({ error: "Impossible de mettre à jour l'utilisateur.", details: errorMessage }, { status: 500 });
  }
}