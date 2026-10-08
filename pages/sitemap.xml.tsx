import type { GetServerSideProps } from 'next'
import shopifyConfig from '@config/shopify'
import { getAllCollectionPaths } from '@lib/shopify/storefront-data-hooks/src/api/operations'
import { fetchAllAvailableProducts, storefrontFetch } from '../services/shopify'
import { POLICY_ROUTES, SHOP_POLICIES_QUERY, type PolicyHandle } from '../lib/shopify-policies'

const SITE_URL = 'https://www.displaycellpros.com'

// Public, indexable pages that don't come from Shopify.
const STATIC_PATHS = [
  '/',
  '/products',
  '/services-faq',
  '/faq',
  '/trends',
  '/order-tracking',
]

// Never let a slow or unreachable Shopify hang or crash the sitemap.
const SHOPIFY_TIMEOUT_MS = 8000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function isValidHandle(handle: unknown): handle is string {
  return typeof handle === 'string' && /^[a-z0-9][a-z0-9-]*$/i.test(handle)
}

async function getProductHandles(): Promise<string[]> {
  try {
    const result = await withTimeout(
      fetchAllAvailableProducts({ onlyAvailable: false, maxProducts: 1000, timeoutMs: SHOPIFY_TIMEOUT_MS }),
      SHOPIFY_TIMEOUT_MS + 1000
    )
    return result.products.map((p) => p.handle).filter(isValidHandle)
  } catch (err) {
    console.error('[sitemap.xml] Failed to load products from Shopify:', err)
    return []
  }
}

async function getCollectionHandles(): Promise<string[]> {
  try {
    const handles = await withTimeout(getAllCollectionPaths(shopifyConfig), SHOPIFY_TIMEOUT_MS)
    return handles.filter(isValidHandle)
  } catch (err) {
    console.error('[sitemap.xml] Failed to load collections from Shopify:', err)
    return []
  }
}

/**
 * Policy pages that have content in Shopify. Empty policies render a
 * placeholder with noindex (pages/policies/[handle].tsx), so they're left out
 * of the sitemap; if Shopify can't be reached, all policies are left out.
 */
async function getIndexablePolicyHandles(): Promise<PolicyHandle[]> {
  try {
    const result = await withTimeout(
      storefrontFetch<{ shop?: Record<string, { body?: string | null } | null> }>({
        query: SHOP_POLICIES_QUERY,
        timeoutMs: SHOPIFY_TIMEOUT_MS,
        retries: 0,
      }),
      SHOPIFY_TIMEOUT_MS + 1000
    )
    if (!result.ok) return []
    return (Object.keys(POLICY_ROUTES) as PolicyHandle[]).filter((handle) => {
      const body = result.data?.shop?.[POLICY_ROUTES[handle].field]?.body
      return typeof body === 'string' && body.trim() !== ''
    })
  } catch (err) {
    console.error('[sitemap.xml] Failed to load policies from Shopify:', err)
    return []
  }
}

export function buildSitemapXml(paths: string[]): string {
  const unique = Array.from(new Set(paths))
  const urls = unique
    .map((path) => `  <url><loc>${escapeXml(SITE_URL + (path === '/' ? '/' : path))}</loc></url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const [products, collections, policies] = await Promise.all([
    getProductHandles(),
    getCollectionHandles(),
    getIndexablePolicyHandles(),
  ])

  const xml = buildSitemapXml([
    ...STATIC_PATHS,
    ...policies.map((handle) => `/policies/${handle}`),
    ...collections.map((handle) => `/collection/${handle}`),
    ...products.map((handle) => `/product/${handle}`),
  ])

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  // Cache at the edge for an hour; serve stale while refreshing for a day.
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.write(xml)
  res.end()

  return { props: {} }
}

// Rendering is handled entirely in getServerSideProps.
export default function Sitemap() {
  return null
}
