import ShopifyBuy from 'shopify-buy'

/**
 * Shopify Storefront API Configuration
 */
export interface ShopifyStorefrontConfig {
  domain: string
  storefrontAccessToken: string
  apiVersion: string
  endpoint: string
  clientId?: string
  clientSecret?: string
  adminAccessToken?: string
}

/**
 * GraphQL Error structure returned by the Shopify Storefront API
 */
export interface StorefrontGraphQLError {
  message: string
  locations?: Array<{ line: number; column: number }>
  path?: string[]
  extensions?: Record<string, any>
}

/**
 * Raw JSON response structure from the Shopify Storefront API
 */
export interface StorefrontGraphQLResponse<T = any> {
  data?: T
  errors?: StorefrontGraphQLError[]
  extensions?: {
    cost?: {
      requestedQueryCost: number
      actualQueryCost?: number
      throttleStatus?: {
        maximumAvailable: number
        currentlyAvailable: number
        restoreRate: number
      }
    }
    [key: string]: any
  }
}

/**
 * Options accepted by the robust fetch utility
 */
export interface StorefrontFetchOptions<TVariables = Record<string, any>> {
  /** GraphQL query or mutation string */
  query: string
  /** GraphQL query variables */
  variables?: TVariables
  /** Optional custom headers to merge */
  headers?: Record<string, string>
  /** Optional custom Storefront endpoint override */
  endpoint?: string
  /** Optional custom Storefront domain override */
  domain?: string
  /** Optional custom Storefront access token override */
  storefrontAccessToken?: string
  /** Optional API version override (e.g. '2024-07') */
  apiVersion?: string
  /** Request timeout in milliseconds (default: 15000ms) */
  timeoutMs?: number
  /** Number of retry attempts on network error or HTTP 429/5xx (default: 2) */
  retries?: number
  /** Delay between retries in milliseconds (default: 1000ms, uses exponential backoff) */
  retryDelayMs?: number
  /** Whether to throw a ShopifyStorefrontError on failure (default: false) */
  throwOnError?: boolean
  /** Next.js / standard fetch cache control */
  cache?: RequestCache
  /** Next.js specific revalidation / tagging options */
  next?: {
    revalidate?: number | false
    tags?: string[]
  }
}

/**
 * Structured result returned by storefrontFetch
 */
export interface StorefrontFetchResult<T = any> {
  data?: T
  errors?: StorefrontGraphQLError[]
  ok: boolean
  status: number
  extensions?: StorefrontGraphQLResponse<T>['extensions']
}

/**
 * Custom Error class for Shopify Storefront API failures
 */
export class ShopifyStorefrontError extends Error {
  status: number
  graphQLErrors?: StorefrontGraphQLError[]
  isRateLimited: boolean
  isAuthError: boolean
  isNetworkError: boolean
  responseBody?: any

  constructor(params: {
    message: string
    status?: number
    graphQLErrors?: StorefrontGraphQLError[]
    responseBody?: any
  }) {
    super(params.message)
    this.name = 'ShopifyStorefrontError'
    this.status = params.status || 0
    this.graphQLErrors = params.graphQLErrors
    this.responseBody = params.responseBody
    this.isRateLimited = params.status === 429
    this.isAuthError = params.status === 401 || params.status === 403
    this.isNetworkError = params.status === 0
  }
}

/**
 * Normalizes and validates Shopify API version (e.g. '2024-07', '2024-10', 'unstable')
 * Falls back to '2024-07' if invalid or accidentally filled with token
 */
export function normalizeShopifyApiVersion(rawVersion?: string): string {
  if (!rawVersion) return '2024-07'
  const trimmed = rawVersion.trim()
  if (/^(\d{4}-\d{2}|unstable)$/.test(trimmed)) {
    return trimmed
  }
  return '2024-07'
}

/**
 * Normalizes store domain string:
 * - strips protocol (http://, https://)
 * - strips trailing slashes
 * - appends '.myshopify.com' if a single sub-domain name is provided
 */
export function normalizeShopifyDomain(rawDomain?: string): string {
  if (!rawDomain) return ''
  let domain = rawDomain.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  if (domain && !domain.includes('.')) {
    domain = `${domain}.myshopify.com`
  }
  return domain
}

/**
 * Reads credentials from environment variables (.env / .env.local)
 * with support for client-side (NEXT_PUBLIC_) and server-side keys
 */
export function getShopifyConfig(): ShopifyStorefrontConfig {
  const isInvalid = (val?: string) => !val || val === 'undefined' || val.includes('[SENSITIVE]')

  const rawDomain = isInvalid(process.env.SHOPIFY_STORE_DOMAIN)
    ? (isInvalid(process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN) ? 'displaycellpros.myshopify.com' : process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN)
    : process.env.SHOPIFY_STORE_DOMAIN

  const token = isInvalid(process.env.SHOPIFY_STOREFRONT_API_TOKEN)
    ? (isInvalid(process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN) ? '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' : process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN)
    : process.env.SHOPIFY_STOREFRONT_API_TOKEN

  const rawApiVersion =
    process.env.SHOPIFY_STOREFRONT_API_VERSION ||
    process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_VERSION
  const apiVersion = normalizeShopifyApiVersion(rawApiVersion)
  const clientId =
    process.env.SHOPIFY_CLIENT_ID ||
    process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID ||
    ''
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || ''
  const adminAccessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || ''

  const domain = normalizeShopifyDomain(rawDomain)
  const endpoint = domain
    ? `https://${domain}/api/${apiVersion}/graphql.json`
    : ''

  return {
    domain,
    storefrontAccessToken: (token || '').trim(),
    apiVersion,
    endpoint,
    clientId,
    clientSecret,
    adminAccessToken,
  }
}

/**
 * Checks whether required Shopify credentials are set
 */
export function isShopifyConfigured(): boolean {
  const { domain, storefrontAccessToken } = getShopifyConfig()
  return Boolean(domain && storefrontAccessToken)
}

/**
 * Resolves appropriate authorization headers based on token type:
 * - Tokens starting with 'shpat_' are private storefront tokens -> 'Shopify-Storefront-Private-Token'
 * - Standard storefront tokens -> 'X-Shopify-Storefront-Access-Token'
 */
export function getStorefrontAuthHeaders(token: string): Record<string, string> {
  const trimmed = token.trim()
  if (trimmed.startsWith('shpat_')) {
    return {
      'Shopify-Storefront-Private-Token': trimmed,
    }
  }
  return {
    'X-Shopify-Storefront-Access-Token': trimmed,
  }
}

/**
 * Custom fetch adapter for ShopifyBuy SDK that routes private tokens correctly
 */
function createStorefrontFetch(token: string) {
  return (url: string, opts: any = {}) => {
    const headers = { ...opts.headers }
    if (token.startsWith('shpat_')) {
      headers['Shopify-Storefront-Private-Token'] = token
      delete headers['X-Shopify-Storefront-Access-Token']
    }
    return fetch(url, { ...opts, headers })
  }
}

// Cached instance of ShopifyBuy client
let buyClientInstance: any = null

/**
 * Initializes and returns a singleton shopify-buy SDK client
 */
export function getShopifyBuyClient() {
  if (buyClientInstance) {
    return buyClientInstance
  }

  const config = getShopifyConfig()
  if (!config.domain || !config.storefrontAccessToken) {
    console.warn(
      '[Shopify Storefront Service] Credentials missing. Please define SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_API_TOKEN in your .env file.'
    )
    return null
  }

  try {
    buyClientInstance = (ShopifyBuy.buildClient as any)(
      {
        domain: config.domain,
        storefrontAccessToken: config.storefrontAccessToken,
      },
      createStorefrontFetch(config.storefrontAccessToken)
    )
    return buyClientInstance
  } catch (error) {
    console.error('[Shopify Storefront Service] Failed to initialize ShopifyBuy SDK client:', error)
    return null
  }
}

// Helper: sleep utility for backoff
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Robust fetch utility to execute GraphQL queries and mutations against Shopify Storefront API.
 * Features:
 * - Dynamic domain & token resolution with custom overrides
 * - Automatic authentication header selection (private vs public storefront token)
 * - Request timeout via AbortController
 * - Automatic exponential backoff retries for rate limits (429) and server errors (5xx)
 * - Structured error handling and optional throwOnError mode
 * - Next.js caching and revalidation support
 */
export async function storefrontFetch<TData = any, TVariables = Record<string, any>>(
  options: StorefrontFetchOptions<TVariables>
): Promise<StorefrontFetchResult<TData>> {
  const {
    query,
    variables,
    headers: customHeaders,
    domain: overrideDomain,
    storefrontAccessToken: overrideToken,
    apiVersion: overrideApiVersion,
    endpoint: overrideEndpoint,
    timeoutMs = 15000,
    retries = 2,
    retryDelayMs = 1000,
    throwOnError = false,
    cache,
    next,
  } = options

  // Resolve config and overrides
  const config = getShopifyConfig()
  const domain = normalizeShopifyDomain(overrideDomain || config.domain)
  const token = (overrideToken || config.storefrontAccessToken || '').trim()
  const apiVersion = overrideApiVersion || config.apiVersion || '2024-07'
  const endpoint =
    overrideEndpoint ||
    (domain ? `https://${domain}/api/${apiVersion}/graphql.json` : '')

  if (!domain || !token || !endpoint) {
    const error = new ShopifyStorefrontError({
      message:
        'Shopify Storefront credentials are missing. Please define SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_API_TOKEN in .env or provide them in options.',
      status: 400,
    })
    if (throwOnError) throw error
    return {
      ok: false,
      status: 400,
      errors: [{ message: error.message }],
    }
  }

  const authHeaders = getStorefrontAuthHeaders(token)
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...authHeaders,
    ...customHeaders,
  }

  const requestBody = JSON.stringify({
    query,
    variables,
  })

  let attempt = 0
  let lastError: any = null

  while (attempt <= retries) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: requestHeaders,
        body: requestBody,
        signal: controller.signal,
        cache,
        ...(next ? { next } : {}),
      })

      clearTimeout(timeoutId)

      // Handle Rate Limiting (HTTP 429) or transient Server Errors (500, 502, 503, 504)
      const shouldRetry =
        (response.status === 429 || (response.status >= 500 && response.status < 600)) &&
        attempt < retries

      if (shouldRetry) {
        attempt++
        const backoff = retryDelayMs * Math.pow(2, attempt - 1)
        console.warn(
          `[Shopify Storefront] Received HTTP ${response.status}. Retrying in ${backoff}ms (attempt ${attempt}/${retries})...`
        )
        await sleep(backoff)
        continue
      }

      let json: StorefrontGraphQLResponse<TData>
      try {
        json = await response.json()
      } catch (parseErr) {
        const error = new ShopifyStorefrontError({
          message: `Failed to parse response from Shopify Storefront API (HTTP ${response.status})`,
          status: response.status,
          responseBody: parseErr,
        })
        if (throwOnError) throw error
        return {
          ok: false,
          status: response.status,
          errors: [{ message: error.message }],
        }
      }

      // Check for non-2xx HTTP status
      if (!response.ok) {
        const errorMsg =
          json.errors?.[0]?.message ||
          `Shopify Storefront API error: ${response.status} ${response.statusText}`
        const error = new ShopifyStorefrontError({
          message: errorMsg,
          status: response.status,
          graphQLErrors: json.errors,
          responseBody: json,
        })
        if (throwOnError) throw error
        return {
          ok: false,
          status: response.status,
          data: json.data,
          errors: json.errors || [{ message: errorMsg }],
          extensions: json.extensions,
        }
      }

      // Successful HTTP response; might still contain GraphQL query errors
      const hasGraphQLErrors = Boolean(json.errors && json.errors.length > 0)
      if (hasGraphQLErrors && throwOnError) {
        throw new ShopifyStorefrontError({
          message:
            json.errors![0].message || 'GraphQL error returned by Shopify Storefront API',
          status: response.status,
          graphQLErrors: json.errors,
          responseBody: json,
        })
      }

      return {
        ok: !hasGraphQLErrors,
        status: response.status,
        data: json.data,
        errors: json.errors,
        extensions: json.extensions,
      }
    } catch (err: any) {
      clearTimeout(timeoutId)
      lastError = err

      // Check if aborted by timeout
      const isTimeout = err?.name === 'AbortError'
      const isNetworkErr = !err?.status

      if ((isTimeout || isNetworkErr) && attempt < retries) {
        attempt++
        const backoff = retryDelayMs * Math.pow(2, attempt - 1)
        console.warn(
          `[Shopify Storefront] ${isTimeout ? 'Request timed out' : 'Network error'}. Retrying in ${backoff}ms (attempt ${attempt}/${retries})...`
        )
        await sleep(backoff)
        continue
      }

      const errorMessage = isTimeout
        ? `Shopify Storefront query timed out after ${timeoutMs}ms`
        : err?.message || 'Unknown network error executing Shopify Storefront GraphQL query'

      const error = new ShopifyStorefrontError({
        message: errorMessage,
        status: err?.status || 0,
        graphQLErrors: err?.graphQLErrors,
        responseBody: err,
      })

      if (throwOnError) throw error
      return {
        ok: false,
        status: error.status,
        errors: [{ message: error.message }],
      }
    }
  }

  const finalError = new ShopifyStorefrontError({
    message: lastError?.message || 'Shopify Storefront request failed after maximum retries',
    status: lastError?.status || 0,
    responseBody: lastError,
  })
  if (throwOnError) throw finalError
  return {
    ok: false,
    status: finalError.status,
    errors: [{ message: finalError.message }],
  }
}

/**
 * Convenient alias for storefrontFetch
 */
export const shopifyFetch = storefrontFetch

/**
 * Creates an isolated Storefront client instance with preset credentials
 */
export function createStorefrontClient(presetConfig?: Partial<ShopifyStorefrontConfig>) {
  return {
    fetch: <TData = any, TVariables = Record<string, any>>(
      options: Omit<StorefrontFetchOptions<TVariables>, 'domain' | 'storefrontAccessToken' | 'apiVersion' | 'endpoint'> & {
        domain?: string
        storefrontAccessToken?: string
        apiVersion?: string
        endpoint?: string
      }
    ) =>
      storefrontFetch<TData, TVariables>({
        ...presetConfig,
        ...options,
      }),
  }
}

// -------------------------------------------------------------------------
// Ready-to-use Storefront GraphQL Operations
// -------------------------------------------------------------------------

export const SHOP_INFO_QUERY = /* GraphQL */ `
  query getShopInfo {
    shop {
      name
      description
      primaryDomain {
        url
        host
      }
      moneyFormat
    }
  }
`

export const ALL_AVAILABLE_PRODUCTS_QUERY = /* GraphQL */ `
  query getAllAvailableProducts(
    $first: Int = 50
    $after: String
    $query: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
  ) {
    products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          id
          handle
          title
          description
          descriptionHtml
          availableForSale
          productType
          vendor
          tags
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          compareAtPriceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          featuredImage {
            url
            altText
            width
            height
          }
          images(first: 10) {
            edges {
              node {
                url
                altText
                width
                height
              }
            }
          }
          variants(first: 50) {
            edges {
              node {
                id
                title
                availableForSale
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`

export interface ShopifyImageNode {
  url: string
  altText?: string | null
  width?: number | null
  height?: number | null
}

export interface ShopifyVariantNode {
  id: string
  title: string
  availableForSale: boolean
  sku?: string | null
  price: {
    amount: string
    currencyCode: string
  }
  compareAtPrice?: {
    amount: string
    currencyCode: string
  } | null
  selectedOptions?: Array<{
    name: string
    value: string
  }>
  image?: ShopifyImageNode | null
}

export interface ShopifyProductOption {
  id: string
  name: string
  values?: string[]
}

export interface ShopifyProductNode {
  id: string
  handle: string
  title: string
  description?: string
  descriptionHtml?: string
  availableForSale: boolean
  productType?: string
  vendor?: string
  tags?: string[]
  priceRange: {
    minVariantPrice: {
      amount: string
      currencyCode: string
    }
    maxVariantPrice: {
      amount: string
      currencyCode: string
    }
  }
  compareAtPriceRange?: {
    minVariantPrice: {
      amount: string
      currencyCode: string
    }
    maxVariantPrice: {
      amount: string
      currencyCode: string
    }
  } | null
  featuredImage?: ShopifyImageNode | null
  images?: {
    edges: Array<{
      node: ShopifyImageNode
    }>
  }
  variants?: {
    edges: Array<{
      node: ShopifyVariantNode
    }>
  }
}

export interface ShopifyProductDetailNode extends ShopifyProductNode {
  options?: ShopifyProductOption[]
  seo?: {
    title?: string | null
    description?: string | null
  }
}

export interface FetchAllAvailableProductsOptions {
  /** Optional additional query filter (e.g. 'Samsung' or 'product_type:Screen Replacement'). Available products filter is preserved. */
  query?: string
  /** Sort key (e.g. 'TITLE', 'PRICE', 'BEST_SELLING', 'CREATED_AT', 'UPDATED_AT', 'ID') */
  sortKey?: string
  /** Reverse sort order */
  reverse?: boolean
  /** Batch size per GraphQL page request (default: 50, max 250) */
  batchSize?: number
  /** Maximum total products to collect (optional limit, defaults to fetching all available) */
  maxProducts?: number
  /** Filter out any unavailable items (default: true) */
  onlyAvailable?: boolean
  /** Request timeout per GraphQL query in ms (default: 15000) */
  timeoutMs?: number
  /** Next.js fetch cache strategy */
  cache?: RequestCache
  /** Next.js revalidation settings */
  next?: {
    revalidate?: number | false
    tags?: string[]
  }
}

export interface ShopifyProductsPageData {
  products: {
    pageInfo: {
      hasNextPage: boolean
      hasPreviousPage?: boolean
      startCursor?: string
      endCursor?: string
    }
    edges: Array<{
      cursor: string
      node: ShopifyProductNode
    }>
  }
}

export interface FetchAllAvailableProductsResult {
  products: ShopifyProductNode[]
  totalCount: number
  ok: boolean
  errors?: StorefrontGraphQLError[]
}

export const PRODUCTS_QUERY = /* GraphQL */ `
  query getProducts($first: Int = 20, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          id
          handle
          title
          description
          availableForSale
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
                width
                height
              }
            }
          }
          variants(first: 20) {
            edges {
              node {
                id
                title
                availableForSale
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
`

export const PRODUCT_BY_HANDLE_QUERY = /* GraphQL */ `
  query getProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      handle
      title
      description
      descriptionHtml
      availableForSale
      productType
      vendor
      tags
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
      compareAtPriceRange {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
      featuredImage {
        url
        altText
        width
        height
      }
      images(first: 20) {
        edges {
          node {
            url
            altText
            width
            height
          }
        }
      }
      variants(first: 50) {
        edges {
          node {
            id
            title
            availableForSale
            sku
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
            selectedOptions {
              name
              value
            }
            image {
              url
              altText
              width
              height
            }
          }
        }
      }
      options {
        id
        name
      }
      seo {
        title
        description
      }
    }
  }
`

export const COLLECTIONS_QUERY = /* GraphQL */ `
  query getCollections($first: Int = 20) {
    collections(first: $first) {
      edges {
        node {
          id
          handle
          title
          description
          image {
            url
            altText
          }
        }
      }
    }
  }
`

export const COLLECTION_BY_HANDLE_QUERY = /* GraphQL */ `
  query getCollectionByHandle($handle: String!, $first: Int = 20) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      image {
        url
        altText
      }
      products(first: $first) {
        edges {
          node {
            id
            handle
            title
            availableForSale
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    }
  }
`

export const CART_FRAGMENT = /* GraphQL */ `
  fragment CartFragment on Cart {
    id
    checkoutUrl
    totalQuantity
    createdAt
    updatedAt
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              title
              sku
              availableForSale
              price {
                amount
                currencyCode
              }
              compareAtPrice {
                amount
                currencyCode
              }
              image {
                url
                altText
                width
                height
              }
              product {
                id
                title
                handle
                vendor
                productType
                featuredImage {
                  url
                  altText
                }
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
    cost {
      totalAmount {
        amount
        currencyCode
      }
      subtotalAmount {
        amount
        currencyCode
      }
    }
  }
`

export const CART_QUERY = /* GraphQL */ `
  ${CART_FRAGMENT}
  query getCart($cartId: ID!) {
    cart(id: $cartId) {
      ...CartFragment
    }
  }
`

export const CART_CREATE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        ...CartFragment
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`

export const CART_LINES_ADD_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`

export const CART_LINES_UPDATE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`

export const CART_LINES_REMOVE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFragment
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`

// -------------------------------------------------------------------------
// Query & Mutation Service Methods
// -------------------------------------------------------------------------

/**
 * Fetches basic shop information (store name, primary domain, currency)
 */
export async function fetchStorefrontShopInfo() {
  return storefrontFetch<{ shop: any }>({
    query: SHOP_INFO_QUERY,
  })
}

/**
 * Fetches all available products from the Shopify Storefront API using pagination.
 * Iterates through all pages using GraphQL cursor pagination until all available products
 * are fetched or the optional maxProducts limit is reached.
 */
export async function fetchAllAvailableProducts(
  options: FetchAllAvailableProductsOptions = {}
): Promise<FetchAllAvailableProductsResult> {
  const {
    query: customQuery,
    sortKey,
    reverse,
    batchSize = 50,
    maxProducts,
    onlyAvailable = true,
    timeoutMs = 15000,
    cache,
    next,
  } = options

  // Build the Storefront search filter:
  // If onlyAvailable is true, ensure available_for_sale:true is included
  let combinedQuery = customQuery ? customQuery.trim() : ''
  if (onlyAvailable) {
    if (!combinedQuery.includes('available_for_sale:')) {
      combinedQuery = combinedQuery
        ? `(${combinedQuery}) AND available_for_sale:true`
        : 'available_for_sale:true'
    }
  }

  const allProducts: ShopifyProductNode[] = []
  let hasNextPage = true
  let cursor: string | undefined = undefined
  let lastErrors: StorefrontGraphQLError[] | undefined = undefined

  // Safe upper limit to prevent runaway loops (Shopify allows up to 250 per page)
  const effectiveBatchSize = Math.min(Math.max(batchSize, 1), 250)

  while (hasNextPage) {
    if (typeof maxProducts === 'number' && allProducts.length >= maxProducts) {
      break
    }

    const remaining =
      typeof maxProducts === 'number' ? maxProducts - allProducts.length : effectiveBatchSize
    const currentFirst = Math.min(effectiveBatchSize, Math.max(remaining, 1))

    // In Shopify Storefront API, RELEVANCE requires a search keyword query;
    // without one, default catalog sort is used
    const effectiveSortKey =
      sortKey === 'RELEVANCE' && (!customQuery || !customQuery.trim())
        ? undefined
        : sortKey

    const response: StorefrontFetchResult<ShopifyProductsPageData> =
      await storefrontFetch<ShopifyProductsPageData>({
        query: ALL_AVAILABLE_PRODUCTS_QUERY,
        variables: {
          first: currentFirst,
          after: cursor,
          query: combinedQuery || undefined,
          sortKey: effectiveSortKey,
          reverse,
        },
        timeoutMs,
        cache,
        next,
      })

    if (!response.ok || !response.data?.products) {
      lastErrors = response.errors
      console.error(
        '[Shopify Storefront] Failed to fetch page of available products:',
        response.errors
      )
      break
    }

    const { pageInfo, edges } = response.data.products

    if (!edges || edges.length === 0) {
      break
    }

    for (const edge of edges) {
      if (!edge?.node) continue
      if (onlyAvailable && edge.node.availableForSale === false) {
        continue
      }
      allProducts.push(edge.node)
      if (typeof maxProducts === 'number' && allProducts.length >= maxProducts) {
        break
      }
    }

    hasNextPage = Boolean(pageInfo?.hasNextPage && pageInfo?.endCursor)
    cursor = pageInfo?.endCursor || undefined
  }

  return {
    products: allProducts,
    totalCount: allProducts.length,
    ok: lastErrors === undefined || allProducts.length > 0,
    errors: lastErrors,
  }
}

/**
 * Sanitizes search terms for safe Storefront API GraphQL querying
 */
export function sanitizeShopifySearchTerm(term: string): string {
  if (!term) return ''
  return term.replace(/[":\\]/g, ' ').trim()
}

/**
 * Searches available products via Shopify Storefront API based on user input
 */
export async function searchStorefrontProducts(
  searchTerm: string,
  options: Omit<FetchAllAvailableProductsOptions, 'query'> = {}
): Promise<FetchAllAvailableProductsResult> {
  const sanitized = sanitizeShopifySearchTerm(searchTerm)
  if (!sanitized) {
    return fetchAllAvailableProducts(options)
  }

  return fetchAllAvailableProducts({
    ...options,
    query: sanitized,
    onlyAvailable: options.onlyAvailable ?? true,
    sortKey: options.sortKey ?? 'RELEVANCE',
    reverse: options.reverse ?? false,
  })
}

/**
 * Convenient alias to fetch all products
 */
export async function fetchAllProducts(options: FetchAllAvailableProductsOptions = {}) {
  return fetchAllAvailableProducts(options)
}

/**
 * Fetches product catalog from Shopify Storefront API
 */
export async function fetchStorefrontProducts(options?: {
  first?: number
  query?: string
  sortKey?: string
  reverse?: boolean
}) {
  return storefrontFetch<{ products: any }>({
    query: PRODUCTS_QUERY,
    variables: {
      first: options?.first ?? 20,
      query: options?.query,
      sortKey: options?.sortKey,
      reverse: options?.reverse,
    },
  })
}

/**
 * Fetches a single product by handle from the Shopify Storefront API
 */
export async function fetchStorefrontProductByHandle(handle: string) {
  return storefrontFetch<{ product: ShopifyProductDetailNode | null }>({
    query: PRODUCT_BY_HANDLE_QUERY,
    variables: { handle },
  })
}

/**
 * Convenient alias for fetchStorefrontProductByHandle
 */
export async function fetchProductByHandle(handle: string) {
  return fetchStorefrontProductByHandle(handle)
}

/**
 * Fetches list of collections
 */
export async function fetchStorefrontCollections(options?: { first?: number }) {
  return storefrontFetch<{ collections: any }>({
    query: COLLECTIONS_QUERY,
    variables: {
      first: options?.first ?? 20,
    },
  })
}

/**
 * Fetches a collection by handle including its products
 */
export async function fetchStorefrontCollectionByHandle(handle: string, first = 20) {
  return storefrontFetch<{ collection: any }>({
    query: COLLECTION_BY_HANDLE_QUERY,
    variables: { handle, first },
  })
}

/**
 * Fetches a cart by ID
 */
export async function fetchStorefrontCart(cartId: string) {
  return storefrontFetch<{ cart: any }>({
    query: CART_QUERY,
    variables: { cartId },
  })
}

/**
 * Creates a new cart with optional initial items and buyer identity
 */
export async function createStorefrontCart(
  lines?: Array<{ merchandiseId: string; quantity: number }>,
  buyerIdentity?: Record<string, any>
) {
  return storefrontFetch<{ cartCreate: any }>({
    query: CART_CREATE_MUTATION,
    variables: {
      input: {
        lines: lines || [],
        ...(buyerIdentity ? { buyerIdentity } : {}),
      },
    },
  })
}

/**
 * Adds lines to an existing cart
 */
export async function addStorefrontCartLines(
  cartId: string,
  lines: Array<{ merchandiseId: string; quantity: number }>
) {
  return storefrontFetch<{ cartLinesAdd: any }>({
    query: CART_LINES_ADD_MUTATION,
    variables: {
      cartId,
      lines,
    },
  })
}

/**
 * Updates lines in an existing cart
 */
export async function updateStorefrontCartLines(
  cartId: string,
  lines: Array<{ id: string; quantity: number }>
) {
  return storefrontFetch<{ cartLinesUpdate: any }>({
    query: CART_LINES_UPDATE_MUTATION,
    variables: {
      cartId,
      lines,
    },
  })
}

/**
 * Removes lines from an existing cart
 */
export async function removeStorefrontCartLines(cartId: string, lineIds: string[]) {
  return storefrontFetch<{ cartLinesRemove: any }>({
    query: CART_LINES_REMOVE_MUTATION,
    variables: {
      cartId,
      lineIds,
    },
  })
}

/**
 * Unified Shopify Storefront API service
 */
export const shopifyStorefront = {
  getConfig: getShopifyConfig,
  isConfigured: isShopifyConfigured,
  getBuyClient: getShopifyBuyClient,
  fetch: storefrontFetch,
  shopifyFetch,
  createClient: createStorefrontClient,
  fetchShopInfo: fetchStorefrontShopInfo,
  fetchProducts: fetchStorefrontProducts,
  fetchAllAvailableProducts,
  fetchAllProducts,
  fetchProductByHandle: fetchStorefrontProductByHandle,
  fetchCollections: fetchStorefrontCollections,
  fetchCollectionByHandle: fetchStorefrontCollectionByHandle,
  fetchCart: fetchStorefrontCart,
  createCart: createStorefrontCart,
  addCartLines: addStorefrontCartLines,
  updateCartLines: updateStorefrontCartLines,
  removeCartLines: removeStorefrontCartLines,
}

export default shopifyStorefront
