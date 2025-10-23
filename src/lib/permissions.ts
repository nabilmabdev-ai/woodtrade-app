// src/lib/permissions.ts
import { Role } from '@prisma/client';
import { permissions, PermissionAction } from './permissions-map';
import { AppUser } from '@/hooks/use-auth';

/**
 * Checks if a user has permission to perform a specific action.
 * @param user The user object, which includes the role.
 * @param action The permission action to check.
 * @returns boolean indicating whether the user has permission.
 */
export function hasPermission(user: AppUser | null, action: PermissionAction): boolean {
  if (!user) {
    return false;
  }
  const allowedRoles = permissions[action];
  return allowedRoles?.includes(user.role) ?? false;
}
