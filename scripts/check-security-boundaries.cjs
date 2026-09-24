const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const failures = []

function read(file) {
  const filePath = path.join(root, file)
  if (!fs.existsSync(filePath)) {
    failures.push(`${file} is missing`)
    return ''
  }
  return fs.readFileSync(filePath, 'utf8')
}

function check(condition, message) {
  if (!condition) failures.push(message)
}

const nextConfig = read('next.config.js')
const shopifyConfig = read('config/shopify.ts')
const login = read('pages/api/account/login.ts')
const callback = read('pages/api/account/callback.ts')
const logout = read('pages/api/account/logout.ts')
const agentContent = read('pages/api/agent/content.ts')
const agentSearch = read('pages/api/agent/search.ts')
const agentCart = read('pages/api/agent/cart.ts')

check(nextConfig.includes("default-src 'self'"), 'CSP must define default-src')
check(nextConfig.includes("script-src 'self'"), 'CSP must define script-src')
check(nextConfig.includes("object-src 'none'"), 'CSP must define object-src none')
check(nextConfig.includes("base-uri 'self'"), 'CSP must define base-uri self')
check(!/^\s*SHOPIFY_(?:STOREFRONT_API_TOKEN|ADMIN_ACCESS_TOKEN)\s*:/m.test(nextConfig), 'Private Shopify credentials must not be exposed by next.config.js')
check(shopifyConfig.includes('isPrivateToken(publicStorefrontAccessToken)'), 'Public Shopify credentials must reject private token formats')

check(login.includes("if (req.method !== 'GET')"), 'Account login must reject non-GET methods')
check(callback.includes("if (req.method !== 'GET')"), 'Account callback must reject non-GET methods')
check(logout.includes('sanitizeReturnTo'), 'Account logout must sanitize returnTo')
check(callback.includes('sanitizeReturnTo(req.cookies[COOKIE.returnTo])'), 'Account callback must sanitize the return cookie before redirecting')
check(!callback.includes('encodeURIComponent(err?.message'), 'OAuth callback must not expose upstream error messages')
check(!login.includes('error?.message ||'), 'Account login must not expose upstream error messages')

check(agentContent.includes('escapeRegex'), 'Builder agent content queries must escape regex metacharacters')
check(agentContent.includes('.slice(0, 120)'), 'Builder agent content queries must be length bounded')
check(agentContent.includes('finally'), 'Builder agent content timeout must be cleared in a finally block')
check(agentSearch.includes('.slice(0, 200)'), 'Agent search queries must be length bounded')
check(agentCart.includes('rawLines.length > 50'), 'Agent cart line count must be bounded')
check(agentCart.includes('Math.min(Math.max'), 'Agent cart quantities must be bounded')

if (failures.length) {
  console.error('check-security-boundaries: FAILED')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exitCode = 1
} else {
  console.log('check-security-boundaries: OK')
}
