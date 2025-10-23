# RBAC Audit Report

| Action | File | Status | Details |
|--------|------|--------|---------|
| manageCreditNotes | billing/credit-notes/route.ts | ✅ MATCH | **Hardcoded:** SUPER_ADMIN, ADMIN, MANAGER, ACCOUNTANT <br> **Centralized:** SUPER_ADMIN, ADMIN, MANAGER, ACCOUNTANT |
| manageInvoices | billing/invoices/route.ts | ❌ MISMATCH | **Hardcoded:** SUPER_ADMIN, ADMIN, MANAGER, CASHIER <br> **Centralized:** SUPER_ADMIN, ADMIN, MANAGER, ACCOUNTANT |
| managePayments | billing/payments/route.ts | ✅ MATCH | **Hardcoded:** SUPER_ADMIN, ADMIN, MANAGER, ACCOUNTANT <br> **Centralized:** SUPER_ADMIN, ADMIN, MANAGER, ACCOUNTANT |
| manageReconciliation | billing/reconciliation/route.ts | ❌ MISMATCH | **Hardcoded:** SUPER_ADMIN, ADMIN, MANAGER, ACCOUNTANT <br> **Centralized:** SUPER_ADMIN, ADMIN, ACCOUNTANT |
| manageCashRegisters | cash-registers/route.ts | ❌ MISMATCH | **Hardcoded:** SUPER_ADMIN, ADMIN <br> **Centralized:** SUPER_ADMIN, ADMIN, MANAGER, CASHIER |
