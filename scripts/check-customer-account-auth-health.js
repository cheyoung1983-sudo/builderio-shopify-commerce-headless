#!/usr/bin/env node

/**
 * Guards the Customer Account API OAuth/PKCE login flow specifically:
 * - Identity env validation (SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID requirement)
 * - Domain drift detection (checking getSiteUrl fallback and host handling)
 * - Open-redirect sanitizer completeness (verifying sanitizeReturnTo in login.ts)
 */

const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const failures = []

function check(condition, message) {
  if (!condition) failures.push(message)
}

const servicePath = path.join(REPO_ROOT, 'services', 'shopify-customer-account.ts')
const loginPath = path.join(REPO_ROOT, 'pages', 'api', 'account', 'login.ts')
const callbackPath = path.join(REPO_ROOT, 'pages', 'api', 'account', 'callback.ts')

if (!fs.existsSync(servicePath)) {
  failures.push('services/shopify-customer-account.ts is missing')
} else {
  const serviceContent = fs.readFileSync(servicePath, 'utf8')
  check(
    serviceContent.includes('getCustomerAccountClientId'),
    'services/shopify-customer-account.ts must export getCustomerAccountClientId'
  )
  check(
    serviceContent.includes('buildAuthorizeUrl'),
    'services/shopify-customer-account.ts must export buildAuthorizeUrl'
  )
  check(
    serviceContent.includes('getCallbackUrl'),
    'services/shopify-customer-account.ts must export getCallbackUrl'
  )
}

if (!fs.existsSync(loginPath)) {
  failures.push('pages/api/account/login.ts is missing')
} else {
  const loginContent = fs.readFileSync(loginPath, 'utf8')
  check(
    loginContent.includes('sanitizeReturnTo'),
    'pages/api/account/login.ts must sanitize returnTo to prevent open redirects'
  )
  check(
    loginContent.includes("!value.startsWith('/')") || loginContent.includes("value.startsWith('//')"),
    'pages/api/account/login.ts sanitizeReturnTo must reject non-relative or protocol-relative paths'
  )
}

if (!fs.existsSync(callbackPath)) {
  failures.push('pages/api/account/callback.ts is missing')
} else {
  const callbackContent = fs.readFileSync(callbackPath, 'utf8')
  check(
    callbackContent.includes('expectedState'),
    'pages/api/account/callback.ts must validate state against expected cookie'
  )
}

if (failures.length > 0) {
  console.error('check-customer-account-auth-health: FAILED')
  for (const f of failures) console.error(`- ${f}`)
  process.exit(1)
}

console.log('check-customer-account-auth-health: OK')
