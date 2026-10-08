import { storefrontFetch } from '@services/shopify'

/**
 * Shopify store policies (Settings → Policies in Shopify admin), rendered at
 * /policies/[handle]. The route slugs match Shopify's own policy handles.
 */
export const POLICY_ROUTES = {
  'privacy-policy': { field: 'privacyPolicy', title: 'Privacy Policy' },
  'terms-of-service': { field: 'termsOfService', title: 'Terms of Service' },
  'shipping-policy': { field: 'shippingPolicy', title: 'Shipping Policy' },
  'refund-policy': { field: 'refundPolicy', title: 'Refund Policy' },
} as const

export type PolicyHandle = keyof typeof POLICY_ROUTES

export interface ShopPolicy {
  title: string
  body: string
  handle: string
}

export const SHOP_POLICIES_QUERY = /* GraphQL */ `
  query getShopPolicies {
    shop {
      privacyPolicy { title body handle }
      termsOfService { title body handle }
      shippingPolicy { title body handle }
      refundPolicy { title body handle }
    }
  }
`

export function isPolicyHandle(value: unknown): value is PolicyHandle {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(POLICY_ROUTES, value)
}

/**
 * Returns the policy for a handle, or null when the store hasn't filled it
 * in (or the Storefront API is unreachable).
 */
export async function fetchShopPolicy(handle: PolicyHandle): Promise<ShopPolicy | null> {
  const result = await storefrontFetch<{ shop?: Record<string, ShopPolicy | null> }>({
    query: SHOP_POLICIES_QUERY,
  })
  if (!result.ok) {
    console.error('[shopify-policies] Storefront query failed:', result.errors?.[0]?.message || result.status)
    return null
  }
  const policy = result.data?.shop?.[POLICY_ROUTES[handle].field]
  if (!policy || typeof policy.body !== 'string' || policy.body.trim() === '') return null
  return {
    title: policy.title || POLICY_ROUTES[handle].title,
    body: policy.body,
    handle: policy.handle || handle,
  }
}
