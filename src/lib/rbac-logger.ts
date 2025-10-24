
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'logs', 'rbac_violations.log');

export function logRbacViolation(userId: string, action: string) {
  const logMessage = `[${new Date().toISOString()}] RBAC VIOLATION: User ${userId} blocked from ${action}\n`;

  if (!fs.existsSync(path.dirname(LOG_FILE))) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  }
  fs.appendFileSync(LOG_FILE, logMessage);
}
