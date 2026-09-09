/**
 * Shopify Admin & Partner App API Service
 * Handles server-side Admin API calls and inventory adjustments.
 * Keeps SHOPIFY_CLIENT_SECRET protected on the server.
 */

export interface ShopifyAdminConfig {
  clientId: string
  clientSecret: string
  storeDomain: string
  apiVersion: string
}

function cleanDomain(rawDomain?: string): string {
  if (!rawDomain) return ''
  let domain = rawDomain.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
  if (domain && !domain.includes('.')) {
    domain = `${domain}.myshopify.com`
  }
  return domain
}

export function getShopifyAdminConfig(): ShopifyAdminConfig {
  return {
    clientId: process.env.SHOPIFY_CLIENT_ID || '',
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET || '',
    storeDomain: cleanDomain(process.env.SHOPIFY_STORE_DOMAIN),
    apiVersion: process.env.SHOPIFY_ADMIN_API_VERSION || '2024-07',
  }
}

/**
 * Checks if Partner App credentials are configured
 */
export function isShopifyAdminConfigured(): boolean {
  const config = getShopifyAdminConfig()
  return Boolean(config.clientId && config.clientSecret)
}

/**
 * Server-side Admin API GraphQL runner
 * Requires an Admin Access Token or offline access token
 */
export async function shopifyAdminFetch<T = any>({
  accessToken,
  query,
  variables,
}: {
  accessToken?: string
  query: string
  variables?: Record<string, any>
}): Promise<{ data?: T; errors?: any[] }> {
  const config = getShopifyAdminConfig()
  const token = accessToken || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN

  if (!config.storeDomain) {
    return {
      errors: [{ message: 'Missing SHOPIFY_STORE_DOMAIN in environment' }],
    }
  }

  if (!token) {
    return {
      errors: [
        {
          message:
            'Missing Admin Access Token. Complete the app installation flow to receive an access token.',
        },
      ],
    }
  }

  const url = `https://${config.storeDomain}/admin/api/${config.apiVersion}/graphql.json`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
    })

    const body = await res.json()
    return body
  } catch (error: any) {
    return {
      errors: [{ message: error?.message || 'Admin API fetch failed' }],
    }
  }
}

export const shopifyAdmin = {
  getConfig: getShopifyAdminConfig,
  isConfigured: isShopifyAdminConfigured,
  fetch: shopifyAdminFetch,
}

export default shopifyAdmin
