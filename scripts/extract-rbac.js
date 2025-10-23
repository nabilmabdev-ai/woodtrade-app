// scripts/extract-rbac.js
const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');
const glob = require('glob');

const HTTP_METHODS = ['GET','POST','PUT','PATCH','DELETE','OPTIONS','HEAD'];

function normalizeRoleText(text) {
  if (!text) return null;
  // remove quotes and whitespace
  const t = text.replace(/['"`]/g, '').trim();
  // if MemberExpression like Role.ADMIN -> take last part
  const parts = t.split('.');
  return parts[parts.length - 1].toUpperCase();
}

function extractFromArrayLiteral(node) {
  // node is ArrayLiteralExpression
  return node.getElements().map(el => {
    // best effort: string literal or identifier or member expression
    try {
      const txt = el.getText();
      return normalizeRoleText(txt);
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
}

function extractFromInitializer(initializer) {
  if (!initializer) return null;
  const kind = initializer.getKindName();
  if (kind === 'ArrayLiteralExpression') {
    return extractFromArrayLiteral(initializer);
  }
  if (kind === 'ObjectLiteralExpression') {
    // return object mapping method -> roles array
    const out = {};
    initializer.getProperties().forEach(prop => {
      const name = prop.getName && prop.getName();
      const val = prop.getInitializer && prop.getInitializer();
      if (val && val.getKindName() === 'ArrayLiteralExpression') {
        out[name.toUpperCase()] = extractFromArrayLiteral(val);
      }
    });
    return out;
  }
  return null;
}

function extractAllowedRolesFromSourceFile(sourceFile) {
  const result = {
    file: sourceFile.getFilePath(),
    byMethod: {}, // method -> [roles]
    generic: null // if ALLOWED_ROLES is simple array
  };

  // 1) top-level variable declarations
  const vars = sourceFile.getVariableDeclarations();
  for (const v of vars) {
    if (v.getName() === 'ALLOWED_ROLES') {
      const initializer = v.getInitializer();
      const extracted = extractFromInitializer(initializer);
      if (Array.isArray(extracted)) {
        result.generic = extracted;
      } else if (extracted && typeof extracted === 'object') {
        // object mapping methods -> arrays
        Object.assign(result.byMethod, extracted);
      }
    }
  }

  // 2) check inside exported route function bodies (GET, POST, etc.)
  const functions = sourceFile.getFunctions().filter(f => f.isExported());
  for (const fn of functions) {
    const name = fn.getName && fn.getName();
    if (!name) continue;
    const upName = name.toUpperCase();
    if (HTTP_METHODS.includes(upName)) {
      // Look for variable declarations named ALLOWED_ROLES in function
      const innerVars = fn.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
      for (const iv of innerVars) {
        if (iv.getName() === 'ALLOWED_ROLES') {
          const initializer = iv.getInitializer && iv.getInitializer();
          const extracted = extractFromInitializer(initializer);
          if (Array.isArray(extracted)) {
            result.byMethod[upName] = extracted;
          } else if (extracted && typeof extracted === 'object') {
            // If someone used object inside function (rare), merge
            Object.assign(result.byMethod, extracted);
          }
        }
      }
    }
  }

  // 3) As a fallback: if generic exists, apply to exported HTTP methods
  if (result.generic) {
    // assign generic to all found exported methods if not already present
    for (const fn of functions) {
      const name = fn.getName && fn.getName();
      const upName = name ? name.toUpperCase() : null;
      if (upName && HTTP_METHODS.includes(upName)) {
        result.byMethod[upName] = result.byMethod[upName] || result.generic;
      }
    }
  }

  return result;
}

async function run(pattern = 'src/app/api/**/*.ts') {
  const project = new Project({
    compilerOptions: {
      allowJs: true,
      target: 99 // ESNext
    }
  });

  const files = glob.sync(pattern, { absolute: true });
  if (!files.length) {
    console.log('No files matched pattern:', pattern);
    return;
  }

  files.forEach(f => project.addSourceFileAtPathIfExists(f));
  const output = [];

  for (const sourceFile of project.getSourceFiles()) {
    try {
      const res = extractAllowedRolesFromSourceFile(sourceFile);
      output.push(res);
      console.log('Parsed', path.relative(process.cwd(), res.file));
      console.log('  byMethod:', JSON.stringify(res.byMethod));
      if (res.generic) console.log('  generic:', res.generic);
    } catch (err) {
      console.error('Failed parsing', sourceFile.getFilePath(), err);
    }
  }

  return output;
}

if (require.main === module) {
  const pattern = process.argv[2] || 'src/app/api/**/*.ts';
  run(pattern).then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(2);
  });
}

module.exports = { run, extractAllowedRolesFromSourceFile };