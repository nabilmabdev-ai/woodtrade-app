// rbac_audit/audit.ts
import * as fs from 'fs';
import * as path from 'path';
import { permissions, PermissionAction } from '@/lib/permissions-map';
import { Role } from '@prisma/client';

// This is a simplified audit script. A real-world scenario would be more robust.

const API_ROUTES_PATH = path.resolve(__dirname, '../src/app/api');

interface AuditResult {
  file: string;
  action: PermissionAction;
  hardcodedRoles: Role[];
  centralizedRoles: Role[];
  status: '✅ MATCH' | '❌ MISMATCH';
}

// Manually map file paths to permission actions.
// This is a limitation of this audit script.
const routeToActionMap: Record<string, PermissionAction> = {
  'billing/invoices/route.ts': 'manageInvoices',
  'billing/payments/route.ts': 'managePayments',
  'cash-registers/route.ts': 'manageCashRegisters',
  'billing/reconciliation/route.ts': 'manageReconciliation',
  'billing/credit-notes/route.ts': 'manageCreditNotes',
};

function findRouteFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  files.forEach((file: string) => {
    const filePath = path.join(dir, file);
    const stat = fs.lstatSync(filePath);
    if (stat.isDirectory()) {
      findRouteFiles(filePath, fileList);
    } else if (file.endsWith('route.ts')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function parseRolesFromRoute(filePath: string): Role[] | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/const allowedRoles: Role\[\] = \[(.*?)\];/);
  if (match && match[1]) {
    return match[1].replace(/'/g, '').split(',').map((role: string) => role.trim() as Role);
  }
  return null;
}

function runAudit() {
  const routeFiles = findRouteFiles(API_ROUTES_PATH);
  const auditResults: AuditResult[] = [];

  for (const filePath of routeFiles) {
    const relativePath = path.relative(API_ROUTES_PATH, filePath);
    const action = routeToActionMap[relativePath];

    if (action) {
      const hardcodedRoles = parseRolesFromRoute(filePath);
      const centralizedRoles = permissions[action];

      if (hardcodedRoles) {
        const sortedHardcoded = [...hardcodedRoles].sort();
        const sortedCentralized = [...centralizedRoles].sort();

        const isMatch = JSON.stringify(sortedHardcoded) === JSON.stringify(sortedCentralized);

        auditResults.push({
          file: relativePath,
          action: action,
          hardcodedRoles: hardcodedRoles,
          centralizedRoles: centralizedRoles,
          status: isMatch ? '✅ MATCH' : '❌ MISMATCH',
        });
      }
    }
  }

  // Generate reports
  fs.writeFileSync(
    path.resolve(__dirname, 'report.json'),
    JSON.stringify(auditResults, null, 2)
  );

  let markdownReport = '# RBAC Audit Report\n\n';
  markdownReport += '| Action | File | Status | Details |\n';
  markdownReport += '|--------|------|--------|---------|\n';
  auditResults.forEach(result => {
    let details = `**Hardcoded:** ${result.hardcodedRoles.join(', ')} <br> **Centralized:** ${result.centralizedRoles.join(', ')}`;
    markdownReport += `| ${result.action} | ${result.file} | ${result.status} | ${details} |\n`;
  });

  fs.writeFileSync(
    path.resolve(__dirname, 'summary.md'),
    markdownReport
  );

  console.log('RBAC audit complete. Reports generated in rbac_audit/');
}

runAudit();
