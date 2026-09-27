# Pre-Build CSP Auditor and Fixer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a pre-build CSP auditing and automated fixing script (`scripts/audit-csp.cjs`) that validates CSP configurations, prevents header conflicts between `vercel.json` and `next.config.js`, and enforces CSP best practices prior to every build.

**Architecture:** A robust Node.js script that reads `vercel.json` and `next.config.js`, validates CSP policies against required third-party integrations (Shopify, Builder.io, GTM, GA, Ads, ElevenLabs), auto-fixes common issues (such as stripping duplicate CSP headers from `vercel.json`), and fails the build if critical policy errors are detected.

**Tech Stack:** Node.js, JavaScript, Next.js, Vercel

**Spec:** [csp-auditor-design.md](file:///C:/Users/cheyo/OneDrive/Documents/GitHub/latest/builderio-shopify-commerce-headless/docs/superpowers/specs/2025-02-24-csp-auditor-design.md)

## Global Constraints
- Script must be written in CommonJS (`.cjs`) for compatibility with Node build scripts in this project.
- Must exit with status code `1` on unresolvable CSP errors to halt broken builds.
- Must support an automated `--fix` flag to safely sanitize configs.

## Review Focus
1. **False Positives:** Ensuring the parser correctly handles multi-line CSP strings joined by `;`.
2. **Conflict Resolution:** Verifying that conflicting `vercel.json` CSP headers are successfully detected and removed when `--fix` is passed.
3. **Build Integration:** Confirming `npm run build` runs the auditor automatically via `prebuild`.

---

### Task 1: Create the CSP Auditor and Fixer Script (`scripts/audit-csp.cjs`)

**Files:**
- Create: `scripts/audit-csp.cjs`
- Test/Check: Execute script via `node scripts/audit-csp.cjs`

**Interfaces:**
- Consumes: `next.config.js` and `vercel.json`
- Produces: Console audit reports, exit codes (`0` or `1`), and auto-fixes when `--fix` is passed.

- [ ] **Step 1: Write `scripts/audit-csp.cjs`**

Create `scripts/audit-csp.cjs` with validation logic for CSP headers, conflict detection between `vercel.json` and `next.config.js`, and `--fix` remediation.

```javascript
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
    console.error('❌ CSP Audit FAILED. Please fix the errors above or run "node scripts/audit-csp.cjs --fix".');
    process.exit(1);
  } else {
    console.log('✨ CSP Audit PASSED.');
    process.exit(0);
  }
}

auditCSP();
```

- [ ] **Step 2: Run the auditor script to verify execution**
Run: `node scripts/audit-csp.cjs`
Expected: PASSED (since vercel.json was already cleaned in Task 1).

- [ ] **Step 3: Integrate into `package.json` build pipeline**

Add `"audit:csp": "node scripts/audit-csp.cjs"` and add it to `"prebuild"` or build script in `package.json`.

- [ ] **Step 4: Commit changes**
```bash
git add scripts/audit-csp.cjs package.json docs/superpowers/specs/2025-02-24-csp-auditor-design.md docs/superpowers/plans/2025-02-24-csp-auditor-plan.md
git commit -m "feat(security): add pre-build CSP auditor and fixer script"
```
