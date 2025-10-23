
const fs = require('fs');
const path = require('path');

const REPORT_PATH = path.join(process.cwd(), 'rbac_audit', 'report.json');

function verifyRbacReport() {
  try {
    const reportRaw = fs.readFileSync(REPORT_PATH, 'utf-8');
    const report = JSON.parse(reportRaw);

    if (!report.mismatches) {
      console.error('Error: Invalid report format. "mismatches" key not found.');
      process.exit(1);
    }

    const mismatches = report.mismatches.filter(item => item.mismatch);

    if (mismatches.length > 0) {
      console.error('❌ RBAC Audit Failed: Mismatches detected.');
      mismatches.forEach(m => {
        console.error(`- ${m.endpoint}`);
      });
      process.exit(1);
    } else {
      console.log('✅ RBAC Audit Passed: No mismatches found.');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error verifying RBAC report:', error.message);
    process.exit(1);
  }
}

verifyRbacReport();
