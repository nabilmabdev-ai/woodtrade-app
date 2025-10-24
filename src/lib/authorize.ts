// src/lib/authorize.ts
import { Role, User } from '@prisma/client';
import { createSupabaseServerClient } from './supabase-server';
import { prisma } from './prisma';
import { logRbacViolation } from './rbac-logger';
import { cookies } from 'next/headers';

// ✅ CORRECTION DÉFINITIVE : Ajout du mot-clé "export" ici.
export async function authorize(allowedRoles: Role[], action: string): Promise<User> {
  console.log(`[AUTH LOG] Authorize started for action: ${action}`);

  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('[AUTH LOG] Incoming cookie names:', allCookies.map(c => c.name).join(', ') || 'NONE');
    console.log('[AUTH LOG] SUPABASE_URL configured:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  } catch (e) {
    console.error('[AUTH LOG] Error reading cookies/env:', e);
  }

  const supabase = createSupabaseServerClient();
  const { data: { session }, error: supabaseError } = await supabase.auth.getSession();

  if (supabaseError) {
    console.error(`[AUTH LOG] Error from supabase.auth.getSession():`, supabaseError.message);
  }

  if (!session) {
    console.error(`[AUTH LOG] CRITICAL: Session is null. Throwing UNAUTHORIZED for action: ${action}.`);
    throw new Error('UNAUTHORIZED');
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (!user) {
    console.error(`[AUTH LOG] User with ID ${session.user.id} not found in DB. Throwing UNAUTHORIZED.`);
    throw new Error('UNAUTHORIZED');
  }

  if (!allowedRoles.includes(user.role)) {
    console.warn(`[AUTH LOG] FORBIDDEN: User ${user.email} (Role: ${user.role}) attempted action: ${action}.`);
    logRbacViolation(user.id, action);
    throw new Error('FORBIDDEN');
  }

  console.log(`[AUTH LOG] Authorization successful for ${action}.`);
  return user;
}