// src/lib/permissions-map.ts
import { Role } from '@prisma/client';

type PermissionsMap = {
  [key: string]: {
    [method: string]: Role[];
  };
};

export const backendPermissionsMap: PermissionsMap = {
  "/billing/credit-notes": {
    "GET": [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.MANAGER
    ],
    "POST": [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.MANAGER,
      Role.ACCOUNTANT
    ]
  },
  "/billing/invoices": {
    "GET": [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.MANAGER,
      Role.ACCOUNTANT
    ],
    "POST": [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.MANAGER
    ]
  },
  "/billing/payments": {
    "GET": [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.MANAGER,
      Role.ACCOUNTANT
    ],
    "POST": [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.MANAGER,
      Role.ACCOUNTANT
    ]
  },
  "/billing/reconciliation": {
    "POST": [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.MANAGER,
      Role.ACCOUNTANT
    ]
  },
  "/cash-register-sessions": {
    "POST": [
      Role.CASHIER,
      Role.MANAGER,
      Role.ADMIN,
      Role.SUPER_ADMIN
    ]
  },
  "/cash-registers": {
    "GET": [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.MANAGER,
      Role.CASHIER
    ],
    "POST": [
      Role.SUPER_ADMIN,
      Role.ADMIN
    ]
  },
  "/cash-registers/[id]/close-session": {
    "POST": [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.MANAGER,
      Role.CASHIER
    ]
  },
  "/cash-registers/[id]/movements": {
    "POST": [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.MANAGER
    ]
  },
  "/inventory": {
    "GET": [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.MANAGER,
      Role.WAREHOUSE
    ]
  },
  "/inventory/adjust": {
    "POST": [
      Role.WAREHOUSE,
      Role.ADMIN,
      Role.SUPER_ADMIN,
      Role.MANAGER
    ]
  },
  "/users": {
    "GET": [
      Role.SUPER_ADMIN,
      Role.ADMIN
    ]
  }
};