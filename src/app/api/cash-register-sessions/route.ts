// src/app/api/cash-register-sessions/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CashRegisterSessionStatus, Role } from '@prisma/client';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';


// The GET function for checking active sessions remains unchanged.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cashRegisterId = searchParams.get('cashRegisterId');

  if (!cashRegisterId) {
    return new NextResponse(
      JSON.stringify({ error: "Le paramètre 'cashRegisterId' est manquant." }),
      { status: 400 }
    );
  }

  try {
    const openSession = await prisma.cashRegisterSession.findFirst({
      where: {
        cashRegisterId: cashRegisterId,
        status: CashRegisterSessionStatus.OPEN,
      },
      include: {
        openedByUser: {
          select: { name: true, email: true, }
        }
      }
    });

    if (!openSession) {
      return NextResponse.json(null);
    }
    
    return NextResponse.json(openSession);

  } catch (error) {
    console.error("Erreur lors de la recherche de session ouverte:", error);
    return new NextResponse(
      JSON.stringify({ error: "Impossible de vérifier la session." }),
      { status: 500 }
    );
  }
}


/**
 * Gère la requête POST pour ouvrir une nouvelle session de caisse.
 *
 * ✅ SÉCURITÉ ET ROBUSTESSE APPLIQUÉES :
 * 1.  Utilise la session Supabase pour identifier l'utilisateur de manière sécurisée.
 * 2.  Implémente une logique "upsert" pour garantir que l'utilisateur existe dans la BDD locale avant de créer la session.
 * 3.  Empêche l'ouverture d'une session si une autre est déjà active sur la même caisse.
 */
export async function POST(request: Request) {
  // 1. Authentification sécurisée de l'utilisateur.
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return new NextResponse(JSON.stringify({ error: 'Non autorisé. Veuillez vous reconnecter.' }), { status: 401 });
  }
  const userId = session.user.id;
  
  // 2. [FIX] "Upsert" de l'utilisateur pour garantir son existence dans la base de données.
  //    Ceci évite les erreurs de clé étrangère pour les nouveaux utilisateurs.
  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {}, // Si l'utilisateur existe, on ne modifie rien.
      create: {   // S'il n'existe pas, on le crée.
        id: userId,
        email: session.user.email!,
        name: session.user.user_metadata?.full_name ?? session.user.email,
        // On assigne un rôle par défaut sûr. CASHIER est approprié.
        role: Role.CASHIER,
      }
    });
  } catch (upsertError) {
      console.error("[API/SESSIONS] Échec de l'upsert de l'utilisateur :", upsertError);
      return new NextResponse(JSON.stringify({ error: "Impossible de synchroniser l'utilisateur." }), { status: 500 });
  }
  
  // 3. Logique métier pour l'ouverture de la session.
  try {
    const body = await request.json();
    const { cashRegisterId, openingBalance } = body;

    if (!cashRegisterId || openingBalance === undefined) {
      return new NextResponse(JSON.stringify({ error: 'Données manquantes: cashRegisterId et openingBalance sont requis.' }), { status: 400 });
    }

    const balance = parseFloat(openingBalance);
    if (isNaN(balance) || balance < 0) {
      return new NextResponse(JSON.stringify({ error: 'Le fonds de caisse doit être un nombre positif.' }), { status: 400 });
    }
    
    // Vérification pour éviter les sessions multiples sur la même caisse.
    const existingOpenSession = await prisma.cashRegisterSession.findFirst({
        where: { cashRegisterId: cashRegisterId, status: CashRegisterSessionStatus.OPEN }
    });

    if (existingOpenSession) {
        return new NextResponse(
            JSON.stringify({ error: 'Cette caisse a déjà une session ouverte. Veuillez la fermer avant d\'en ouvrir une nouvelle.' }),
            { status: 409 } // 409 Conflict
        );
    }

    // Création de la session en utilisant l'ID de l'utilisateur authentifié (garanti d'exister).
    const newSession = await prisma.cashRegisterSession.create({
      data: {
        cashRegisterId,
        openingBalance: balance,
        openedByUserId: userId, // ✅ Utilisation de l'ID sécurisé de la session.
        status: CashRegisterSessionStatus.OPEN,
      },
    });

    return NextResponse.json(newSession, { status: 201 });

  } catch (error) {
    console.error("Erreur lors de l'ouverture de la session de caisse:", error);
    return new NextResponse(JSON.stringify({ error: "Impossible d'ouvrir la session de caisse." }), { status: 500 });
  }
}