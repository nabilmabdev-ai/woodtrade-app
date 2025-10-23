
const backendPermissionsMap = {
  "/billing/credit-notes": {
    GET: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
    POST: ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT"]
  },
  "/billing/invoices": {
    GET: ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT"],
    POST: ["SUPER_ADMIN", "ADMIN", "MANAGER"]
  },
  "/billing/payments": {
    GET: ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT"],
    POST: ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT"]
  },
  "/billing/reconciliation": {
    POST: ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT"]
  },
  "/cash-register-sessions": {
    POST: ["CASHIER", "MANAGER", "ADMIN", "SUPER_ADMIN"]
  },
  "/cash-registers": {
    GET: ["SUPER_ADMIN", "ADMIN", "MANAGER", "CASHIER"],
    POST: ["SUPER_ADMIN", "ADMIN"]
  },
  "/cash-registers/[id]/close-session": {
    POST: ["SUPER_ADMIN", "ADMIN", "MANAGER", "CASHIER"]
  },
  "/cash-registers/[id]/movements": {
    POST: ["SUPER_ADMIN", "ADMIN", "MANAGER"]
  },
  "/inventory": {
    GET: ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"]
  },
  "/inventory/adjust": {
    POST: ["WAREHOUSE", "ADMIN", "SUPER_ADMIN", "MANAGER"]
  },
  "/users": {
    GET: ["SUPER_ADMIN", "ADMIN"]
  }
};

module.exports = { backendPermissionsMap };
