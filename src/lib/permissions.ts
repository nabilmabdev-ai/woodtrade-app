import { Role } from '@prisma/client';

// Centralized role definitions for clarity and consistency
const SUPER_ADMIN: Role = 'SUPER_ADMIN';
const ADMIN: Role = 'ADMIN';
const MANAGER: Role = 'MANAGER';
const CASHIER: Role = 'CASHIER';
const WAREHOUSE: Role = 'WAREHOUSE';
const ACCOUNTANT: Role = 'ACCOUNTANT';

// Sidebar and Navigation Permissions
export const canViewUsers = (role: Role) => [SUPER_ADMIN, ADMIN].includes(role);
export const canViewBilling = (role: Role) => [SUPER_ADMIN, ADMIN, MANAGER, ACCOUNTANT].includes(role);
export const canViewWarehouse = (role: Role) => [SUPER_ADMIN, ADMIN, MANAGER, WAREHOUSE].includes(role);
export const canViewCashRegisters = (role: Role) => [SUPER_ADMIN, ADMIN, MANAGER, CASHIER].includes(role);

// Billing Page Permissions
export const canCreateInvoices = (role: Role) => [SUPER_ADMIN, ADMIN, MANAGER].includes(role);
export const canManagePayments = (role: Role) => [SUPER_ADMIN, ADMIN, MANAGER, ACCOUNTANT].includes(role);
export const canManageCreditNotes = (role: Role) => [SUPER_ADMIN, ADMIN, MANAGER].includes(role);
export const canViewReconciliation = (role: Role) => [SUPER_ADMIN, ADMIN, MANAGER, ACCOUNTANT].includes(role);

// Cash Register Permissions
export const canAddCashRegister = (role: Role) => [SUPER_ADMIN, ADMIN].includes(role);
export const canManageCashRegisterSession = (role: Role) => [SUPER_ADMIN, ADMIN, MANAGER, CASHIER].includes(role);
export const canCreateCashRegisterMovement = (role: Role) => [SUPER_ADMIN, ADMIN, MANAGER].includes(role);

// Warehouse Permissions
export const canManageWarehouse = (role: Role) => [SUPER_ADMIN, ADMIN, MANAGER, WAREHOUSE].includes(role);
