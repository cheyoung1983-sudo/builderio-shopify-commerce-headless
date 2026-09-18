#!/usr/bin/env node

/**
 * Verifies — and with --fix, repairs — the plumbing that keeps
 * www.displaycellpros.com showing the live catalog from
 * displaycellpros.myshopify.com instead of stale or demo data:
 *
 *   1. The Storefront API domain/token actually resolve and reach Shopify
 *   2. The catalog has published, available products the Storefront API can see
 *   3. Every catalog-driving page keeps a short ISR `revalidate` window, so
 *      catalog edits in Shopify Admin show up without a redeploy
 *   4. next.config.js keeps cdn.shopify.com / *.myshopify.com allowlisted in
 *      CSP and next/image, so the browser doesn't silently block product
 *      images or client-side Storefront API calls
 *   5. Whether a graceful demo-catalog fallback exists for ACCESS_DENIED —
 *      it currently does not (see checkDemoFallbackWiring below), so a bad
 *      token silently renders an empty catalog instead of degrading; this
 *      check exists to catch that regressing further, and to keep flagging
 *      it until the fallback is actually built or the docs are corrected
 *
 * Mechanical issues (a stale revalidate value, a missing CSP/image entry)
 * are safe to auto-correct and are fixed with --fix. Credential problems
 * (an invalid token, a store with zero published products) can't be fixed
 * by a script — those print the exact Shopify Admin / Vercel steps instead.
 *
 * Usage:
 *   node scripts/check-shopify-catalog-health.js         # report only
 *   node scripts/check-shopify-catalog-health.js --fix    # also auto-fix
 */

const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..')
const FIX = process.argv.includes('--fix')
const MAX_REVALIDATE_SECONDS = 60
const EXPECTED_DOMAIN = 'displaycellpros.myshopify.com'

// Mirror how `next dev`/other scripts in this repo resolve env vars.
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(path.join(repoRoot, file))
  } catch {
    // file doesn't exist — fine, fall through to process.env as-is
  }
}

const problems = []

function report(level, message, opts = {}) {
  problems.push({ level, message, fixable: !!opts.fixable, fixed: !!opts.fixed })
}

// ---------------------------------------------------------------------
// Resolve config the same way config/shopify.ts does
// ---------------------------------------------------------------------
function normalizeDomain(raw) {
  if (!raw) return ''
  let domain = raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  if (domain && !domain.includes('.')) domain = `${domain}.myshopify.com`
  return domain
}

const domain =
  normalizeDomain(process.env.SHOPIFY_STORE_DOMAIN) ||
  normalizeDomain(process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN) ||
  normalizeDomain(process.env.SHOPIFY_DOMAIN) ||
  EXPECTED_DOMAIN

const token = (
  process.env.SHOPIFY_STOREFRONT_API_TOKEN ||
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN ||
  ''
).trim()

const apiVersion = (process.env.SHOPIFY_STOREFRONT_API_VERSION || '2024-07').trim()

if (domain !== EXPECTED_DOMAIN) {
  report(
    'warning',
    `Resolved Shopify domain is "${domain}", not the expected "${EXPECTED_DOMAIN}". If this is a different environment on purpose, ignore this; otherwise check SHOPIFY_STORE_DOMAIN.`
  )
}

if (!token) {
  report(
    'error',
    'No Shopify Storefront API token found (SHOPIFY_STOREFRONT_API_TOKEN / NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN). The site cannot reach the catalog at all without one — set it in .env.local and in Vercel Project Settings > Environment Variables.'
  )
}

if (/^(shpat_|shpua_)/i.test(process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN || '')) {
  report(
    'error',
    'NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN is a private token (shpat_/shpua_). That leaks an admin-capable token into the browser bundle — replace it with a public Storefront token from Shopify Admin > Apps and sales channels > Headless > Storefront API.'
  )
}

// ---------------------------------------------------------------------
// 1. Live Storefront API reachability + catalog contents
// ---------------------------------------------------------------------
async function checkLiveCatalog() {
  if (!token) return // already reported above

  const endpoint = `https://${domain}/api/${apiVersion}/graphql.json`
  const isPrivateToken = /^(shpat_|shpua_)/i.test(token)
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(isPrivateToken
      ? { 'Shopify-Storefront-Private-Token': token }
      : { 'X-Shopify-Storefront-Access-Token': token }),
  }
  const query = `
    query CatalogHealth {
      shop { name primaryDomain { host } }
      products(first: 5, sortKey: UPDATED_AT, reverse: true) {
        edges { node { id title availableForSale } }
      }
    }
  `

  let response
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
      signal: controller.signal,
    })
    clearTimeout(timer)
  } catch (err) {
    report(
      'error',
      `Could not reach ${endpoint}: ${err.message}. Check network access and that the domain is correct.`
    )
    return
  }

  let body = null
  try {
    body = await response.json()
  } catch {
    // leave body null — handled below
  }

  const accessDenied =
    body?.errors?.some(
      (e) => e?.extensions?.code === 'ACCESS_DENIED' || /ACCESS_DENIED/i.test(e?.message || '')
    ) ||
    response.status === 401 ||
    response.status === 403

  if (accessDenied) {
    report(
      'error',
      `Storefront API rejected the request (ACCESS_DENIED / HTTP ${response.status}) for ${domain}. The token is invalid, revoked, or lacks Storefront API access — fetchAllAvailableProducts() will silently return zero products for this (no demo-mode fallback exists, see the warning below), so the live site would render as an empty storefront. Fix: Shopify Admin > Apps and sales channels > Headless > Storefront API — issue/verify a token, then update SHOPIFY_STOREFRONT_API_TOKEN (server) and NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN (browser) in Vercel and .env.local.`
    )
    return
  }

  if (!response.ok || body?.errors?.length) {
    report(
      'error',
      `Storefront API returned an error (HTTP ${response.status}): ${JSON.stringify(body?.errors || body).slice(0, 300)}`
    )
    return
  }

  const shop = body?.data?.shop
  const products = body?.data?.products?.edges || []

  if (!shop) {
    report('error', 'Storefront API responded but returned no shop data — unexpected response shape.')
    return
  }

  console.log(`\n  Connected shop : ${shop.name} (${shop.primaryDomain?.host || 'unknown host'})`)
  console.log(`  Products found : ${products.length} (5 most recently updated)`)

  if (products.length === 0) {
    report(
      'warning',
      'The Storefront API is reachable but returned zero products. Either nothing is published to the storefront\'s sales channel, or everything is unavailable — check Shopify Admin > Products > Sales channels.'
    )
  } else if (products.every((p) => !p.node.availableForSale)) {
    report(
      'warning',
      `All ${products.length} most-recently-updated products are marked unavailable for sale (out of stock / draft). The connection is healthy but the storefront will look empty.`
    )
  }
}

// ---------------------------------------------------------------------
// 2. ISR freshness: every catalog-driving page must keep a short
//    `revalidate` window, or catalog updates only show up on redeploy.
// ---------------------------------------------------------------------
const CATALOG_PAGES = [
  'pages/[[...path]].tsx',
  'pages/product/[handle].tsx',
  'pages/collection/[handle].tsx',
  'pages/products.tsx',
]

function checkRevalidate() {
  for (const rel of CATALOG_PAGES) {
    const filePath = path.join(repoRoot, rel)
    if (!fs.existsSync(filePath)) {
      report(
        'warning',
        `${rel} not found — the catalog page inventory changed; update CATALOG_PAGES in scripts/check-shopify-catalog-health.js.`
      )
      continue
    }

    let content = fs.readFileSync(filePath, 'utf8')
    if (!content.includes('getStaticProps')) continue // not an ISR page

    const matches = [...content.matchAll(/revalidate:\s*(\d+|false)/g)]

    if (matches.length === 0) {
      report(
        'error',
        `${rel} has getStaticProps but no "revalidate" — this page will never refresh after the first build, so catalog changes on ${EXPECTED_DOMAIN} won't appear until the next deploy. Add "revalidate: ${MAX_REVALIDATE_SECONDS}" to its returned props.`
      )
      continue
    }

    let fileFixed = false
    for (const m of matches) {
      const raw = m[1]
      const seconds = raw === 'false' ? Infinity : Number(raw)
      if (seconds > MAX_REVALIDATE_SECONDS) {
        report(
          'warning',
          `${rel}: revalidate is ${raw}s (> ${MAX_REVALIDATE_SECONDS}s) — catalog updates can take that long to appear on the live site.`,
          { fixable: true, fixed: FIX }
        )
        if (FIX) {
          content = content.replace(m[0], `revalidate: ${MAX_REVALIDATE_SECONDS}`)
          fileFixed = true
        }
      }
    }

    if (fileFixed) {
      fs.writeFileSync(filePath, content)
      console.log(`  [fixed] ${rel}: capped revalidate at ${MAX_REVALIDATE_SECONDS}s`)
    }
  }
}

// ---------------------------------------------------------------------
// 3. CSP / next/image must keep Shopify's CDN and storefront domain
//    allowlisted, or product images/API calls get silently blocked in
//    the browser with CSP console errors.
// ---------------------------------------------------------------------
function checkNextConfig() {
  const filePath = path.join(repoRoot, 'next.config.js')
  let content = fs.readFileSync(filePath, 'utf8')
  let fixed = false

  if (!/hostname:\s*'cdn\.shopify\.com'/.test(content)) {
    report(
      'error',
      'next.config.js images.remotePatterns is missing cdn.shopify.com — next/image will refuse to render Shopify product images.',
      { fixable: true, fixed: FIX }
    )
    if (FIX) {
      content = content.replace(
        /remotePatterns:\s*\[/,
        `remotePatterns: [\n      { protocol: 'https', hostname: 'cdn.shopify.com' },`
      )
      fixed = true
    }
  }

  if (!/img-src[^"]*cdn\.shopify\.com/.test(content)) {
    report(
      'error',
      'next.config.js CSP img-src is missing https://cdn.shopify.com — browsers will block product images as a CSP violation.',
      { fixable: true, fixed: FIX }
    )
    if (FIX) {
      content = content.replace(
        /"img-src 'self' data:/,
        `"img-src 'self' data: https://cdn.shopify.com`
      )
      fixed = true
    }
  }

  if (!/connect-src[^"]*\*\.myshopify\.com/.test(content)) {
    report(
      'error',
      'next.config.js CSP connect-src is missing https://*.myshopify.com — browser-side Storefront API calls (cart, search) will be blocked by CSP.',
      { fixable: true, fixed: FIX }
    )
    if (FIX) {
      content = content.replace(
        /"connect-src 'self'/,
        `"connect-src 'self' https://*.myshopify.com`
      )
      fixed = true
    }
  }

  if (fixed) {
    fs.writeFileSync(filePath, content)
    console.log('  [fixed] next.config.js: restored Shopify CDN/API allowlist entries')
  }
}

// ---------------------------------------------------------------------
// 4. On ACCESS_DENIED, fetchAllAvailableProducts() currently just logs a
//    warning and returns zero products — there is no lib/shopify/demo-catalog.ts
//    to fall back to, despite CLAUDE.md documenting one. That means a bad
//    token doesn't crash, but it does silently render an empty storefront
//    with no visible "something's wrong" signal. This can't be safely
//    auto-fixed (inventing placeholder catalog content isn't a mechanical
//    fix), so it's reported every run as a standing reminder that the live
//    Storefront API check above (and --fix's other checks) is the real
//    safety net until that fallback is built or the docs are corrected.
// ---------------------------------------------------------------------
function checkDemoFallbackWiring() {
  const demoCatalogPath = path.join(repoRoot, 'lib/shopify/demo-catalog.ts')
  if (!fs.existsSync(demoCatalogPath)) {
    report(
      'warning',
      'lib/shopify/demo-catalog.ts does not exist. On ACCESS_DENIED, fetchAllAvailableProducts() (services/shopify.ts) returns zero products with no "demo mode" indicator — the storefront would just look empty. CLAUDE.md documents a demo-catalog fallback that isn\'t actually implemented; either build it or update the docs.'
    )
  }
}

// ---------------------------------------------------------------------
async function main() {
  console.log('='.repeat(70))
  console.log(` Shopify Catalog Health Check${FIX ? '  (--fix enabled)' : ''}`)
  console.log('='.repeat(70))
  console.log(`  Domain       : ${domain}`)
  console.log(`  API Version  : ${apiVersion}`)
  console.log(`  Token        : ${token ? 'present' : 'MISSING'}`)

  await checkLiveCatalog()
  checkRevalidate()
  checkNextConfig()
  checkDemoFallbackWiring()

  console.log('\n' + '='.repeat(70))

  if (problems.length === 0) {
    console.log(` HEALTHY — www.displaycellpros.com is correctly wired to the live catalog on ${EXPECTED_DOMAIN}`)
    console.log('='.repeat(70))
    return
  }

  for (const p of problems) {
    const marker = p.level === 'error' ? '✗' : '!'
    const fixNote = p.fixed ? ' [auto-fixed]' : p.fixable && !FIX ? ' [re-run with --fix]' : ''
    console.log(`  ${marker} ${p.message}${fixNote}`)
  }

  const errors = problems.filter((p) => p.level === 'error')
  const warnings = problems.filter((p) => p.level === 'warning')
  const fixedCount = problems.filter((p) => p.fixed).length
  const remainingErrors = errors.filter((e) => !e.fixed)

  console.log('\n' + '='.repeat(70))
  console.log(` ${errors.length} error(s), ${warnings.length} warning(s)${FIX ? `, ${fixedCount} auto-fixed` : ''}`)
  console.log('='.repeat(70))

  if (remainingErrors.length > 0) {
    if (!FIX && remainingErrors.some((e) => e.fixable)) {
      console.log('\nRun `node scripts/check-shopify-catalog-health.js --fix` to auto-correct the fixable issues above.')
    }
    console.log('\nRemaining issues need action outside this repo (Shopify Admin and/or Vercel dashboard) — see messages above.')
    process.exitCode = 1
  }
}

main()
