#!/usr/bin/env node

/**
 * Diagnostic utility for Shopify Storefront API connectivity.
 *
 * Uses the current environment variables to fetch the shop name from the
 * Storefront API. If the request fails with ACCESS_DENIED, it specifically logs
 * the request and response headers along with the full response error object
 * to help diagnose domain/token configuration mismatches.
 *
 * Usage:
 *   node scripts/diagnose-shopify.js
 */

const fs = require('node:fs')
const path = require('node:path')

// Load environment variables from .env.local and .env if present
function loadEnv() {
  const root = path.resolve(__dirname, '..')
  const envFiles = ['.env.local', '.env']

  for (const file of envFiles) {
    const fullPath = path.join(root, file)
    if (!fs.existsSync(fullPath)) continue

    try {
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(fullPath)
      } else {
        const content = fs.readFileSync(fullPath, 'utf8')
        for (const line of content.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const eqIdx = trimmed.indexOf('=')
          if (eqIdx === -1) continue
          const key = trimmed.slice(0, eqIdx).trim()
          let val = trimmed.slice(eqIdx + 1).trim()
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1)
          }
          if (!process.env[key]) {
            process.env[key] = val
          }
        }
      }
    } catch {
      // Ignore parsing errors for missing or locked files
    }
  }
}

loadEnv()

function maskSecret(val) {
  if (!val || typeof val !== 'string') return '(empty)'
  if (val.length <= 8) return '****'
  return `${val.slice(0, 4)}...${val.slice(-4)}`
}

function normalizeDomain(rawDomain) {
  if (!rawDomain) return ''
  let domain = rawDomain.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  if (domain && !domain.includes('.')) {
    domain = `${domain}.myshopify.com`
  }
  return domain
}

async function runDiagnostic() {
  console.log('='.repeat(70))
  console.log(' Shopify Storefront API Diagnostic')
  console.log('='.repeat(70))

  const domain =
    normalizeDomain(process.env.SHOPIFY_STORE_DOMAIN) ||
    normalizeDomain(process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN) ||
    normalizeDomain(process.env.SHOPIFY_DOMAIN)

  const token = (
    process.env.SHOPIFY_STOREFRONT_API_TOKEN ||
    process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN ||
    ''
  ).trim()

  const apiVersion = (
    process.env.SHOPIFY_STOREFRONT_API_VERSION || '2024-07'
  ).trim()

  console.log('\n[Environment Detection]')
  console.log(`  Shopify Domain : ${domain || '(not set)'}`)
  console.log(`  API Version    : ${apiVersion}`)
  console.log(`  Token Present  : ${token ? 'Yes' : 'No'}`)
  if (token) {
    const isPrivate = token.startsWith('shpat_') || token.startsWith('shpua_')
    console.log(`  Token Mask     : ${maskSecret(token)} (${isPrivate ? 'Private Token' : 'Public Storefront Token'})`)
  }

  if (!domain) {
    console.error('\n[Error] Missing SHOPIFY_STORE_DOMAIN (or NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN).')
    console.error('Please configure your Shopify store domain in .env.local or environment variables.')
    process.exit(1)
  }

  if (!token) {
    console.error('\n[Error] Missing SHOPIFY_STOREFRONT_API_TOKEN (or NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN).')
    console.error('Please configure your Shopify Storefront token in .env.local or environment variables.')
    process.exit(1)
  }

  const endpoint = `https://${domain}/api/${apiVersion}/graphql.json`
  const isPrivateToken = token.startsWith('shpat_') || token.startsWith('shpua_')

  const requestHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'Shopify-Storefront-Diagnostic/1.0',
    ...(isPrivateToken
      ? { 'Shopify-Storefront-Private-Token': token }
      : { 'X-Shopify-Storefront-Access-Token': token }),
  }

  // Sanitized headers for display
  const displayRequestHeaders = {
    ...requestHeaders,
    ...(isPrivateToken
      ? { 'Shopify-Storefront-Private-Token': maskSecret(token) }
      : { 'X-Shopify-Storefront-Access-Token': maskSecret(token) }),
  }

  const query = `
    query DiagnosticGetShopName {
      shop {
        name
        description
        primaryDomain {
          host
          url
          sslEnabled
        }
      }
    }
  `

  console.log('\n[Storefront API Request]')
  console.log(`  Endpoint : ${endpoint}`)
  console.log('  Headers  :', JSON.stringify(displayRequestHeaders, null, 2))

  const startTime = Date.now()
  let response
  let rawBodyText = ''
  let parsedJson = null

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({ query }),
    })
    rawBodyText = await response.text()
    try {
      parsedJson = JSON.parse(rawBodyText)
    } catch {
      parsedJson = null
    }
  } catch (netErr) {
    console.error('\n[Network Error]')
    console.error(`  Failed to reach ${endpoint}: ${netErr.message}`)
    process.exit(1)
  }

  const elapsedMs = Date.now() - startTime
  const responseHeaders = {}
  response.headers.forEach((val, key) => {
    responseHeaders[key] = val
  })

  const hasAccessDeniedError =
    parsedJson?.errors?.some(
      (err) =>
        err?.extensions?.code === 'ACCESS_DENIED' ||
        err?.extensions?.code === 'UNAUTHORIZED' ||
        err?.message === 'ACCESS_DENIED' ||
        /ACCESS_DENIED|UNAUTHORIZED/i.test(err?.message || '')
    ) ||
    response.status === 401 ||
    response.status === 403

  if (hasAccessDeniedError) {
    const isExplicitAccessDenied = parsedJson?.errors?.some(
      (err) =>
        err?.extensions?.code === 'ACCESS_DENIED' ||
        /ACCESS_DENIED/i.test(err?.message || '')
    )
    const errorTitle = isExplicitAccessDenied ? 'ACCESS_DENIED' : 'ACCESS_DENIED / UNAUTHORIZED'

    console.error('\n' + '!'.repeat(70))
    console.error(` DIAGNOSTIC FAILURE: ${errorTitle}`)
    console.error('!'.repeat(70))

    console.error('\n[HTTP Status]')
    console.error(`  Status : ${response.status} ${response.statusText} (${elapsedMs}ms)`)

    console.error('\n[Request Headers Sent]')
    console.error(JSON.stringify(displayRequestHeaders, null, 2))

    console.error('\n[Response Headers Received from Shopify]')
    console.error(JSON.stringify(responseHeaders, null, 2))

    console.error('\n[Full Response Error Object]')
    if (parsedJson) {
      console.error(JSON.stringify(parsedJson, null, 2))
    } else {
      console.error(rawBodyText || '(empty response body)')
    }

    console.error('\n[Configuration Mismatch Checklist]')
    console.error('1. Domain vs Token Mismatch:')
    console.error(`   - Is this token created for "${domain}" or a different Shopify store?`)
    if (responseHeaders['x-shopid']) {
      console.error(`   - Shopify response returned X-ShopId: ${responseHeaders['x-shopid']}`)
    }
    console.error('2. Token Scope & Permissions:')
    console.error('   - Ensure the token has Storefront API access enabled.')
    console.error('   - In Shopify Admin: Go to Apps & Sales Channels -> Headless -> Storefront API.')
    console.error('   - Ensure "Read products", "Read content", etc. are checked.')
    console.error('3. Token Header Type:')
    if (isPrivateToken) {
      console.error('   - Note: Token starts with "shpat_" (Private). It was sent using "Shopify-Storefront-Private-Token".')
    } else {
      console.error('   - Note: Token was sent using "X-Shopify-Storefront-Access-Token" (Public Storefront token).')
    }
    console.error('4. Vercel vs Local Environment:')
    console.error('   - Verify that SHOPIFY_STOREFRONT_API_TOKEN in Vercel Project Settings matches your active Storefront API token.')

    process.exit(1)
  }

  if (!response.ok || parsedJson?.errors?.length) {
    console.error('\n[API Request Error]')
    console.error(`  Status : ${response.status} ${response.statusText} (${elapsedMs}ms)`)
    console.error('\n[Full Response]')
    console.error(JSON.stringify(parsedJson || rawBodyText, null, 2))
    process.exit(1)
  }

  const shop = parsedJson?.data?.shop
  console.log('\n' + '='.repeat(70))
  console.log(' SUCCESS: Shopify Storefront API Connected!')
  console.log('='.repeat(70))
  console.log(`  Shop Name        : ${shop?.name || '(unknown)'}`)
  console.log(`  Description      : ${shop?.description || '(none)'}`)
  console.log(`  Primary Domain   : ${shop?.primaryDomain?.url || shop?.primaryDomain?.host || '(unknown)'}`)
  console.log(`  Roundtrip Time   : ${elapsedMs}ms`)
  console.log('='.repeat(70))
}

runDiagnostic()
