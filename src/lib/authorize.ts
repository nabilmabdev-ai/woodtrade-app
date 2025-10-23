// lib/authorize.ts
// lib/authorize.ts
import { Role, User } from '@prisma/client';
import { createSupabaseServerClient } from './supabase-server';
import { prisma } from './prisma';
import { permissions, PermissionAction } from './permissions-map';

export async function authorize(action: PermissionAction): Promise<User> {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('UNAUTHORIZED');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    // Even if the session is valid, the user might not exist in our DB
    throw new Error('UNAUTHORIZED');
  }

  const allowedRoles = permissions[action];
  if (!allowedRoles || !allowedRoles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }

  return user;
}
