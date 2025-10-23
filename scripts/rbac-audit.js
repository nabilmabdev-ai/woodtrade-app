// scripts/rbac-audit.js
const fs = require('fs');
const path = require('path');
const { backendPermissionsMap } = require('../src/lib/permissions-map');
const { run: extractAllRoles } = require('./extract-rbac');

const OUTPUT_DIR = path.join(process.cwd(), 'rbac_audit');
const REPORT_JSON_PATH = path.join(OUTPUT_DIR, 'report.json');
const SUMMARY_MD_PATH = path.join(OUTPUT_DIR, 'summary.md');
const VERBOSE_JSON_PATH = path.join(OUTPUT_DIR, 'raw_verbose.json');

const isVerbose = process.argv.includes('--verbose');

function normalizeAndSort(roles = []) {
  if (!Array.isArray(roles)) return [];
  return [...new Set(roles.map(r => String(r).toUpperCase()))].sort();
}

async function auditRbac() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const parsedFilesData = await extractAllRoles('src/app/api/**/route.ts');

  const mismatches = [];
  let summary = '# RBAC Audit Summary\n\n';
  let totalMismatches = 0;
  let checkedEndpoints = 0;
  const verboseOutput = [];

  console.log(`Starting RBAC audit on ${parsedFilesData.length} API route files...`);

  const filePathsInCode = new Set();

  for (const fileData of parsedFilesData) {
    const relativePath = path.relative(process.cwd(), fileData.file);
    const routePathForMap = ('/' + relativePath)
        .replace(/\\/g, '/')
        .replace('src/app/api', '')
        .replace('/route.ts', '')
        .replace(/\/$/, '') || '/';

    filePathsInCode.add(routePathForMap);

    const backendRolesFromFile = fileData.byMethod;
    const mapEntry = backendPermissionsMap[routePathForMap];

    const verboseEntry = {
      file: relativePath,
      path: routePathForMap,
      status: 'match',
      details: []
    };

    if (!mapEntry && Object.keys(backendRolesFromFile).length > 0) {
      const detail = {
        type: 'Path Missing from Map',
        endpoint: routePathForMap,
        error: 'This API route file exists but is not registered in `src/lib/permissions-map.js`.',
      };
      verboseEntry.details.push(detail);
      mismatches.push(detail);
      totalMismatches++;
    }

    const methodsInFile = new Set(Object.keys(backendRolesFromFile));
    const methodsInMap = new Set(mapEntry ? Object.keys(mapEntry) : []);
    const allMethods = new Set([...methodsInFile, ...methodsInMap]);

    for (const method of allMethods) {
        checkedEndpoints++;
        const endpoint = `${method} ${routePathForMap}`;
        const rolesFromFile = normalizeAndSort(backendRolesFromFile[method]);
        const rolesFromMap = normalizeAndSort(mapEntry ? mapEntry[method] : undefined);

        if (JSON.stringify(rolesFromFile) !== JSON.stringify(rolesFromMap)) {
            const detail = {
                type: 'Role Mismatch',
                endpoint,
                rolesInFile: rolesFromFile,
                rolesInMap: rolesFromMap,
            };
            verboseEntry.details.push(detail);
            mismatches.push(detail);
            totalMismatches++;
        }
    }

    if (verboseEntry.details.length > 0) {
        verboseEntry.status = 'mismatch';
        console.error(`❌ Mismatches found in: ${relativePath}`);
    } else if (Object.keys(backendRolesFromFile).length > 0) {
        console.log(`✅ All methods match for: ${relativePath}`);
    }
    verboseOutput.push(verboseEntry);
  }

  // Check for paths in map that don't exist in the codebase
  for (const mapPath in backendPermissionsMap) {
      if (!filePathsInCode.has(mapPath)) {
          const detail = {
              type: 'Path Missing from Code',
              endpoint: mapPath,
              error: 'This path is defined in `src/lib/permissions-map.js` but no corresponding API route file was found.',
          };
          mismatches.push(detail);
          totalMismatches++;
          console.error(`❌ Path from map not found in codebase: ${mapPath}`);
      }
  }


  // Generate Summary
  if (totalMismatches === 0) {
    summary += `✅ All ${checkedEndpoints} API endpoints passed! No RBAC mismatches found.\n`;
  } else {
    summary += `Found ${totalMismatches} total mismatch(es) across the codebase.\n\n---\n\n`;
    for (const item of mismatches) {
        summary += `### ❌ ${item.type}: \`${item.endpoint || 'N/A'}\`\n`;
        if (item.error) {
            summary += `- **Error**: ${item.error}\n`;
        }
        if (item.rolesInFile) {
            summary += `- **Actual (in file)**: \`[${item.rolesInFile.join(', ')}]\`\n`;
            summary += `- **Expected (in map)**: \`[${item.rolesInMap.join(', ')}]\`\n`;
        }
        summary += '\n';
    }
  }

  fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify({ mismatches }, null, 2));
  fs.writeFileSync(SUMMARY_MD_PATH, summary);

  if (isVerbose) {
    fs.writeFileSync(VERBOSE_JSON_PATH, JSON.stringify(verboseOutput, null, 2));
    console.log(`\nVerbose report generated at ${VERBOSE_JSON_PATH}`);
  }

  console.log(`\nAudit complete. Report generated at ${REPORT_JSON_PATH}`);
  console.log(`Summary generated at ${SUMMARY_MD_PATH}`);

  if (totalMismatches > 0) {
      console.error(`\nFound ${totalMismatches} mismatches. Exiting with error.`);
      process.exit(1);
  } else {
      console.log('\n✅ No RBAC mismatches found.');
  }
}

auditRbac().catch(error => {
    console.error("Fatal error during RBAC audit:", error);
    process.exit(1);
});
