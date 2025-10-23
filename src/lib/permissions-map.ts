// src/lib/permissions-map.ts
import { Role } from '@prisma/client';

export type PermissionAction =
  | 'manageInvoices'
  | 'voidInvoices'
  | 'managePayments'
  | 'manageCashRegisters'
  | 'manageReconciliation'
  | 'manageCreditNotes'
  | 'manageUsers'
  | 'viewDashboard'
  | 'manageProducts'
  | 'manageInventory'
  | 'managePurchases';

export const permissions: Record<PermissionAction, Role[]> = {
  // Billing
  manageInvoices: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'],
  voidInvoices: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  managePayments: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'],
  manageCreditNotes: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'],
  manageReconciliation: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'],

  // Point of Sale
  manageCashRegisters: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'],

  // Administration
  manageUsers: ['SUPER_ADMIN', 'ADMIN'],
  viewDashboard: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'],

  // Inventory & Products
  manageProducts: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  manageInventory: ['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE'],
  managePurchases: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
};
