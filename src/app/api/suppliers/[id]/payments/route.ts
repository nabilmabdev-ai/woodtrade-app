// src/app/api/suppliers/[id]/payments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupplierPaymentStatus, Prisma, Role } from '@prisma/client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Define the roles that are allowed to view financial data for suppliers.
const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.ADMIN, Role.SUPER_ADMIN, Role.MANAGER];

/**
 * Gère la requête GET pour récupérer les paiements d'un fournisseur.
 *
 * SÉCURITÉ APPLIQUÉE : Seuls les utilisateurs avec un rôle autorisé peuvent
 * accéder à ces informations financières sensibles.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
          },
        }
    );

  try {
    // 1. Authentification : Vérifier la session de l'utilisateur.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse(JSON.stringify({ error: "Non autorisé." }), { status: 401 });
    }

    // 2. Autorisation : Vérifier le rôle de l'utilisateur.
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return new NextResponse(JSON.stringify({ error: "Accès refusé. Permissions insuffisantes." }), { status: 403 });
    }

    // 3. Si l'utilisateur est autorisé, procéder à la logique métier.
    const { id: supplierId } = await context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    if (!supplierId) {
      return new NextResponse(JSON.stringify({ error: "L'ID du fournisseur est manquant." }), { status: 400 });
    }

    const whereClause: Prisma.SupplierPaymentWhereInput = { supplierId: supplierId };
    if (status === 'available') {
      whereClause.status = { in: [SupplierPaymentStatus.AVAILABLE, SupplierPaymentStatus.PARTIALLY_ALLOCATED] };
    }

    const payments = await prisma.supplierPayment.findMany({
      where: whereClause,
      include: { allocations: true },
      orderBy: { paymentDate: 'desc' },
    });
    
    const paymentsWithBalance = payments.map(payment => {
      const totalAllocated = payment.allocations.reduce((sum, alloc) => sum + alloc.amountAllocated, 0);
      const remainingAmount = payment.amount - totalAllocated;
      return {
        id: payment.id,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        method: payment.method,
        status: payment.status,
        remainingAmount: remainingAmount,
      };
    }).filter(p => status === 'available' ? p.remainingAmount > 0.001 : true);

    return NextResponse.json(paymentsWithBalance);

  } catch (error) {
    const idFromContext = context.params ? (await context.params).id : 'inconnu';
    console.error(`Erreur lors de la récupération des paiements pour le fournisseur ${idFromContext}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne.";
    return new NextResponse(
      JSON.stringify({ error: 'Impossible de récupérer les paiements', details: errorMessage }),
      { status: 500 }
    );
  }
}