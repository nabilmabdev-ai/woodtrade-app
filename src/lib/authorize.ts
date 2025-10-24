// src/lib/authorize.ts
import { Role, User } from '@prisma/client';
import { createSupabaseServerClient } from './supabase-server';
import { prisma } from './prisma';
import { logRbacViolation } from './rbac-logger';

export async function authorize(allowedRoles: Role[], action: string): Promise<User> {
  // Log when the function is called to trace the request flow
  console.log(`[DIAGNOSTIC LOG] Authorize function started for action: ${action}`);

  const supabase = createSupabaseServerClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  // ✅ THIS IS THE MOST IMPORTANT LOG:
  // It will print the entire session object or null to the Vercel logs.
  console.log(`[DIAGNOSTIC LOG] Result from supabase.auth.getSession() for action "${action}":`, JSON.stringify(session, null, 2));

  // Also log if there was an error fetching the session
  if (error) {
    console.error(`[DIAGNOSTIC LOG] Error from getSession():`, error.message);
  }

  if (!session) {
    console.error(`[DIAGNOSTIC LOG] CRITICAL: Session is null. Throwing UNAUTHORIZED for action: ${action}.`);
    throw new Error('UNAUTHORIZED');
  }

  // If the session exists, the rest of the logs will run
  console.log(`[DIAGNOSTIC LOG] Session found for user ID: ${session.user.id}. Looking up user in Prisma DB.`);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    console.error(`[DIAGNOSTIC LOG] User with ID ${session.user.id} not found in database. Throwing UNAUTHORIZED.`);
    throw new Error('UNAUTHORIZED');
  }

  console.log(`[DIAGNOSTIC LOG] User ${user.email} has role ${user.role}. Checking against allowed roles: ${allowedRoles.join(', ')}.`);
  if (!allowedRoles.includes(user.role)) {
    console.warn(`[DIAGNOSTIC LOG] FORBIDDEN: User ${user.email} (Role: ${user.role}) attempted action: ${action}.`);
    logRbacViolation(user.id, action);
    throw new Error('FORBIDDEN');
  }

  console.log(`[DIAGNOSTIC LOG] Authorization successful for ${action}.`);
  return user;
}