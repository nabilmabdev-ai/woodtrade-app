// src/lib/authorize.ts
import { Role, User } from '@prisma/client';
import { createSupabaseServerClient } from './supabase-server';
import { prisma } from './prisma';
import { logRbacViolation } from './rbac-logger';

export async function authorize(allowedRoles: Role[], action: string): Promise<User> {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('UNAUTHORIZED');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    // Même si la session est valide, l'utilisateur peut ne pas exister dans notre BDD
    throw new Error('UNAUTHORIZED');
  }

  if (!allowedRoles.includes(user.role)) {
    logRbacViolation(user.id, action);
    throw new Error('FORBIDDEN');
  }

  return user;
}