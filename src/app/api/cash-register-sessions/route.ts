// src/app/api/cash-register-sessions/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CashRegisterSessionStatus, Role } from '@prisma/client';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';


// La fonction GET reste inchangée. Elle est utilisée par le POS pour vérifier les sessions.
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

    // S'il n'y a pas de session, on retourne null, ce qui est une réponse valide.
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


// --- ✅ FONCTION POST ENTIÈREMENT MISE À JOUR AVEC LOGS ---
export async function POST(request: Request) {
  console.log('[API] Requête POST reçue sur /api/cash-register-sessions'); // <-- LOG A

  // 1. Identification sécurisée de l'utilisateur via la session cookie.
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    console.error('[API] Échec : Aucune session Supabase trouvée. Non autorisé.'); // <-- LOG B
    return new NextResponse(JSON.stringify({ error: 'Non autorisé. Veuillez vous reconnecter.' }), { status: 401 });
  }
  const userId = session.user.id;
  console.log(`[API] Session Supabase trouvée pour l'utilisateur ID : ${userId}`); // <-- LOG C

  // 2. [BLOC DE SÉCURITÉ] "Get or Create" (upsert) de l'utilisateur.
  // Cette opération garantit que l'utilisateur existe dans notre BDD avant de continuer.
  try {
    console.log(`[API] Tentative d'upsert pour l'utilisateur ${userId}...`); // <-- LOG D
    await prisma.user.upsert({
      where: { id: userId },
      update: {}, // S'il existe, on ne fait rien.
      create: {   // S'il n'existe pas, on le crée.
        id: userId,
        email: session.user.email!,
        name: session.user.user_metadata?.full_name ?? session.user.email,
        // On assigne un rôle par défaut sûr. CASHIER est approprié ici.
        role: Role.CASHIER, 
      }
    });
    console.log(`[API] Upsert de l'utilisateur ${userId} réussi.`); // <-- LOG E
  } catch (upsertError) {
      console.error("[API] Échec de l'upsert de l'utilisateur :", upsertError); // <-- LOG F
      return new NextResponse(JSON.stringify({ error: "Impossible de synchroniser l'utilisateur." }), { status: 500 });
  }
  
  // 3. Logique métier pour ouvrir la session.
  try {
    const body = await request.json();
    // Le `userId` n'est plus lu depuis le body.
    const { cashRegisterId, openingBalance } = body;
    console.log('[API] Corps de la requête parsé :', body); // <-- LOG G


    if (!cashRegisterId || openingBalance === undefined) {
      return new NextResponse(
        JSON.stringify({ error: 'Données manquantes: cashRegisterId et openingBalance sont requis.' }),
        { status: 400 }
      );
    }

    const balance = parseFloat(openingBalance);
    if (isNaN(balance) || balance < 0) {
      return new NextResponse(
        JSON.stringify({ error: 'Le fonds de caisse doit être un nombre positif.' }),
        { status: 400 }
      );
    }
    
    // On vérifie qu'une session n'est pas déjà ouverte pour cette caisse.
    const existingOpenSession = await prisma.cashRegisterSession.findFirst({
        where: {
            cashRegisterId: cashRegisterId,
            status: CashRegisterSessionStatus.OPEN
        }
    });

    if (existingOpenSession) {
        console.warn(`[API] Conflit : une session est déjà ouverte pour la caisse ${cashRegisterId}.`); // <-- LOG H
        return new NextResponse(
            JSON.stringify({ error: 'Cette caisse a déjà une session ouverte. Veuillez la fermer avant d\'en ouvrir une nouvelle.' }),
            { status: 409 } // 409 Conflict
        );
    }

    console.log(`[API] Création de la session pour la caisse ${cashRegisterId} par l'utilisateur ${userId}...`); // <-- LOG I
    // On crée la session en utilisant l'ID de l'utilisateur authentifié.
    const newSession = await prisma.cashRegisterSession.create({
      data: {
        cashRegisterId,
        openingBalance: balance,
        openedByUserId: userId, // ✅ On utilise l'ID qui est maintenant garanti d'exister.
        status: CashRegisterSessionStatus.OPEN,
      },
    });

    console.log('[API] Session créée avec succès :', newSession.id); // <-- LOG J
    return NextResponse.json(newSession, { status: 201 });

  } catch (error) {
    console.error("Erreur lors de l'ouverture de la session de caisse:", error); // <-- LOG K
    
    // Gère l'erreur de clé étrangère si, pour une raison improbable, l'upsert a échoué.
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003') {
        return new NextResponse(
          JSON.stringify({ error: "L'utilisateur associé n'a pas pu être vérifié. Essayez de rafraîchir la page." }),
          { status: 500 }
        );
    }
    return new NextResponse(
      JSON.stringify({ error: "Impossible d'ouvrir la session de caisse." }),
      { status: 500 }
    );
  }
}