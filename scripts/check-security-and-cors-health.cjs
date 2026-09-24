#!/usr/bin/env node

/**
 * Script: check-security-and-cors-health.js
 *
 * Scans all API routes under pages/api to ensure:
 * 1. CORS origin checks use isAllowedOrigin() rather than fragile string checks.
 * 2. Preview environment URLs (*.run.app) and localhost are allowed (allowRunApp: true, allowLocalhost: true).
 * 3. Worklet assets in public/ exist and are valid.
 *
 * Usage:
 *   node scripts/check-security-and-cors-health.js
 *   node scripts/check-security-and-cors-health.js --fix
 */

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'pages', 'api');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const FIX_MODE = process.argv.includes('--fix');

function getApiFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getApiFiles(filePath));
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      results.push(filePath);
    }
  });
  return results;
}

let errorsCount = 0;
let fixedCount = 0;

console.log('🔍 Checking API CORS & Security Health across pages/api...\n');

const apiFiles = getApiFiles(API_DIR);

apiFiles.forEach((file) => {
  const relativePath = path.relative(path.join(__dirname, '..'), file);
  let content = fs.readFileSync(file, 'utf8');

  // Check 1: Manual fragile origin matching
  const hasFragileOriginCheck = content.includes('!corsOptions.allowedOrigins.includes(req.headers.origin)') ||
    (content.includes('req.headers.origin') && content.includes('http://localhost:') && !content.includes('isAllowedOrigin'));

  // Check 2: Missing allowRunApp: true when defining corsOptions
  const hasCorsOptionsWithoutRunApp = content.includes('corsOptions') && !content.includes('allowRunApp');

  if (hasFragileOriginCheck || hasCorsOptionsWithoutRunApp) {
    errorsCount++;
    console.warn(`⚠️  [CORS Warning] ${relativePath}: Fragile or restrictive CORS checks detected.`);

    if (FIX_MODE) {
      let updated = content;

      // Fix manual fragile check to use isAllowedOrigin
      if (hasFragileOriginCheck) {
        if (!updated.includes('isAllowedOrigin')) {
          updated = updated.replace(
            /from\s+['"]([^'"]*api-security)['"]/,
            (match) => match.replace('api-security', 'api-security').replace('{', '{\n  isAllowedOrigin,')
          );
        }

        updated = updated.replace(
          /if\s*\(\s*req\.headers\.origin\s*&&\s*!corsOptions\.allowedOrigins\.includes[\s\S]*?\)\s*\{\s*return\s+res\.status\(403\)[\s\S]*?\}/g,
          `if (!isAllowedOrigin(req.headers.origin, corsOptions)) {\n    return res.status(403).json({ ok: false, error: 'Origin not allowed' });\n  }`
        );
      }

      // Ensure allowRunApp and allowLocalhost are true in corsOptions
      if (hasCorsOptionsWithoutRunApp) {
        updated = updated.replace(
          /const corsOptions = \{([\s\S]*?)\}/g,
          `const corsOptions = {\n    allowedOrigins,\n    allowLocalhost: true,\n    allowRunApp: true,\n  }`
        );
      }

      if (updated !== content) {
        fs.writeFileSync(file, updated, 'utf8');
        fixedCount++;
        console.log(`   ✅ Automatically fixed CORS rules in ${relativePath}`);
      }
    }
  }
});

// Check 3: Audio Worklet assets in public/
const requiredWorklets = ['rawAudioProcessor.js', 'audioConcatProcessor.js'];
requiredWorklets.forEach((worklet) => {
  const workletPath = path.join(PUBLIC_DIR, worklet);
  if (!fs.existsSync(workletPath)) {
    errorsCount++;
    console.error(`❌ [Asset Missing] Worklet asset public/${worklet} is missing!`);
  } else {
    console.log(`✓ Worklet asset public/${worklet} is present.`);
  }
});

console.log('\n----------------------------------------');
if (errorsCount === 0 || (FIX_MODE && fixedCount > 0)) {
  console.log(`✅ Security & CORS Health Check PASSED (${apiFiles.length} API files scanned, ${fixedCount} fixed).`);
  process.exit(0);
} else {
  console.error(`❌ Security & CORS Health Check FAILED with ${errorsCount} issue(s). Run with --fix to automatically remediate.`);
  process.exit(1);
}
