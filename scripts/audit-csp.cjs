/**
 * CSP Auditor and Fixer Script
 * Validates Content Security Policy configuration across next.config.js and vercel.json.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const vercelPath = path.join(projectRoot, 'vercel.json');
const nextConfigPath = path.join(projectRoot, 'next.config.js');

const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');

function auditCSP() {
  console.log('🔍 Running CSP Pre-Build Audit...');
  let errors = 0;
  let warnings = 0;

  // 1. Check vercel.json for conflicting CSP headers
  if (fs.existsSync(vercelPath)) {
    try {
      const vercelContent = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
      if (vercelContent.headers) {
        for (const rule of vercelContent.headers) {
          if (rule.headers) {
            const cspHeader = rule.headers.find(h => h.key && h.key.toLowerCase() === 'content-security-policy');
            if (cspHeader) {
              console.error('❌ ERROR: Conflicting static Content-Security-Policy found in vercel.json!');
              console.error('   Next.js next.config.js should be the sole authority for CSP headers.');
              errors++;

              if (shouldFix) {
                console.log('🛠️ Fixing: Removing Content-Security-Policy from vercel.json...');
                rule.headers = rule.headers.filter(h => h.key.toLowerCase() !== 'content-security-policy');
                fs.writeFileSync(vercelPath, JSON.stringify(vercelContent, null, 2) + '\n');
                console.log('✅ vercel.json updated successfully.');
                errors--;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('❌ ERROR parsing vercel.json:', err.message);
      errors++;
    }
  }

  // 2. Check next.config.js for CSP header definition
  if (fs.existsSync(nextConfigPath)) {
    const nextConfigCode = fs.readFileSync(nextConfigPath, 'utf8');
    if (!nextConfigCode.includes('Content-Security-Policy')) {
      console.warn('⚠️ WARNING: Content-Security-Policy header not explicitly found in next.config.js.');
      warnings++;
    } else {
      console.log('✅ Content-Security-Policy header found in next.config.js.');

      // Check for essential directives
      const requiredDirectives = ["default-src", "script-src", "style-src", "connect-src", "img-src"];
      for (const directive of requiredDirectives) {
        if (!nextConfigCode.includes(directive)) {
          console.warn(`⚠️ WARNING: Directive '${directive}' not found in CSP configuration.`);
          warnings++;
        }
      }
    }
  } else {
    console.error('❌ ERROR: next.config.js not found.');
    errors++;
  }

  console.log(`\n📊 CSP Audit Complete: ${errors} error(s), ${warnings} warning(s).`);

  if (errors > 0) {
    console.error('❌ CSP Audit FAILED. Please fix the errors above or run "npm run fix:csp".');
    process.exit(1);
  } else {
    console.log('✨ CSP Audit PASSED.');
    process.exit(0);
  }
}

auditCSP();
