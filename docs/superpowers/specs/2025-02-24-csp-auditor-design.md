# Pre-Build CSP Auditor and Fixer Script Design Specification

## Overview
To prevent Content Security Policy (CSP) errors and header conflicts in production deployments (such as on Vercel), this specification defines a pre-build auditing and automated sanitization script (`scripts/audit-csp.cjs`). This script integrates into the CI/CD and local build pipeline (`npm run prebuild`) to validate CSP headers in `next.config.js` and `vercel.json`, detect conflicts, and automatically flag or fix misconfigurations.

## Research & Best Practices (MDN & Next.js)
1. **Single Source of Truth:** Next.js `next.config.js` (`async headers()`) must be the sole authority for CSP headers. Static CSP definitions in `vercel.json` cause overriding and header duplication.
2. **Directive Completeness:** Every production asset domain (Analytics, GTM, Ads, Shopify Storefront, Builder.io, ElevenLabs) must be explicitly whitelisted under its correct directive (`script-src`, `connect-src`, `img-src`, `style-src`, `frame-src`, `worker-src`).
3. **Automated Pre-Build Enforcement:** Running checks prior to build execution prevents broken production deployments due to missing or malformed CSP strings.

## Proposed Solution: `scripts/audit-csp.cjs`
1. **File Parsing & AST Inspection:** Reads `next.config.js` and `vercel.json`.
2. **Conflict Checks:**
   - Error if `vercel.json` contains a `Content-Security-Policy` header.
   - Warn if critical directives (`script-src`, `connect-src`) are missing standard required domains.
3. **Auto-Remediation Mode (`--fix`):**
   - Automatically strips `Content-Security-Policy` from `vercel.json` if present.
   - Ensures required safe fallbacks (`default-src 'self'`, `object-src 'none'`) are present.
4. **Pipeline Integration:**
   - Add `"audit:csp": "node scripts/audit-csp.cjs"` to `package.json`.
   - Include `npm run audit:csp` in the `prebuild` lifecycle script.
