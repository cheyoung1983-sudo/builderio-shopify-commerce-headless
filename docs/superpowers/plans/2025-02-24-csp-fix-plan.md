# Content Security Policy (CSP) Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve production CSP errors on `www.displaycellpros.com` by consolidating security headers into Next.js (`next.config.js`) and removing conflicting static CSP headers from `vercel.json`.

**Architecture:** We will strip the redundant `Content-Security-Policy` entry from `vercel.json` to prevent Vercel deployment header collisions and rely exclusively on `next.config.js`'s dynamic `async headers()` configuration which correctly whitelists all required third-party services (GTM, GA, Google Ads, Shopify, Builder.io, ElevenLabs, Vercel Live).

**Tech Stack:** Next.js, Vercel Deployment Configuration, HTTP Security Headers (CSP)

**Spec:** [csp-fix-design.md](file:///C:/Users/cheyo/OneDrive/Documents/GitHub/latest/builderio-shopify-commerce-headless/docs/superpowers/specs/2025-02-24-csp-fix-design.md)

## Global Constraints
- Single source of truth for security headers in Next.js `next.config.js`.
- No conflicting or restrictive static CSP in `vercel.json`.
- Strict adherence to MDN CSP standards.

## Review Focus
1. **Third-Party Script Blocking:** Ensuring GTM, Google Ads, and analytics scripts load without CSP violations.
2. **Media & Worker Loading:** Verifying ElevenLabs Web Workers/audio and Cloudinary/Shopify/Builder.io images load correctly.
3. **Connect-src Whitelisting:** Confirming API calls to Shopify Storefront, Builder.io, and analytics endpoints are unblocked.

---

### Task 1: Update `vercel.json` to Remove Conflicting CSP Header

**Files:**
- Modify: `vercel.json`

**Interfaces:**
- Consumes: None
- Produces: `vercel.json` without conflicting static `Content-Security-Policy` header.

- [ ] **Step 1: Inspect `vercel.json` headers section**
Read `vercel.json` to locate the `Content-Security-Policy` header entry under headers.
- [ ] **Step 2: Remove the Content-Security-Policy entry from `vercel.json`**
Update `vercel.json` to remove the `Content-Security-Policy` key while keeping non-conflicting headers or letting Next.js manage CSP.
- [ ] **Step 3: Verify build config**
Run `npm run build` to ensure the project builds successfully without JSON or deployment config errors.

### Task 2: Audit and Verify CSP Directives in `next.config.js`

**Files:**
- Modify: `next.config.js` (if any directive updates are required)

**Interfaces:**
- Consumes: Environment variables and Next.js config structure.
- Produces: Comprehensive and robust CSP headers in `next.config.js`.

- [ ] **Step 1: Review `next.config.js` CSP header values against production requirements**
Check `script-src`, `connect-src`, `img-src`, `style-src`, `frame-src`, and `worker-src` in `next.config.js`.
- [ ] **Step 2: Test production build and header output**
Run `npm run build` and verify that Next.js correctly compiles and generates the expected header rules.
- [ ] **Step 3: Commit changes**
```bash
git add vercel.json next.config.js docs/superpowers/specs/2025-02-24-csp-fix-design.md docs/superpowers/plans/2025-02-24-csp-fix-plan.md
git commit -m "fix(security): consolidate CSP headers in next.config.js and remove conflicting vercel.json CSP"
```
