import { buildClient } from 'shopify-buy'

const fastClone = (obj: any) => obj ? JSON.parse(JSON.stringify(obj)) : null

function getSafeClient(config: ShopifyBuy.Config) {
  if (!config?.domain || !config?.storefrontAccessToken || config.domain === 'undefined' || config.domain.includes('[SENSITIVE]')) {
    return null
  }
  try {
    const customFetch = (url: string, opts: any = {}) => {
      if (!url || url.includes('undefined') || url.includes('//api/')) {
        throw new Error(`Invalid Shopify URL: ${url}`)
      }
      const headers = { ...opts.headers }
      if (config.storefrontAccessToken.startsWith('shpat_')) {
        headers['Shopify-Storefront-Private-Token'] = config.storefrontAccessToken
        delete headers['X-Shopify-Storefront-Access-Token']
      }
      return fetch(url, { ...opts, headers })
    }
    return (buildClient as any)(config, customFetch)
  } catch (e) {
    console.warn('Failed to build ShopifyBuy client:', e)
    return null
  }
}

export async function getAllProducts(config: ShopifyBuy.Config, limit?: number) {
  const client = getSafeClient(config)
  if (!client) return []
  try {
    return (await client.product.fetchAll(limit)) || []
  } catch (e) {
    console.warn('Shopify getAllProducts error:', e)
    return []
  }
}

export async function getAllProductPaths(
  config: ShopifyBuy.Config,
  limit?: number
): Promise<string[]> {
  const client = getSafeClient(config)
  if (!client) return []
  try {
    // interface need update
    const products: any[] = (await client.product.fetchAll(limit)) || []
    return products.map((val) => val.handle)
  } catch (e) {
    console.warn('Shopify getAllProductPaths error:', e)
    return []
  }
}

export async function getProduct(
  config: ShopifyBuy.Config,
  options: { id?: string; handle?: string }
) {
  const client = getSafeClient(config)
  if (!client) return null
  try {
    if (options.handle) {
      return fastClone(await client.product.fetchByHandle(options.handle))
    }
    if (!options.id) {
      return null
    }
    return fastClone(await client.product.fetch(options.id))
  } catch (e) {
    console.warn('Shopify getProduct error:', e)
    return null
  }
}

export async function getAllCollections(config: ShopifyBuy.Config, limit?: number) {
  const client = getSafeClient(config)
  if (!client) return []
  try {
    return (await client.collection.fetchAll(limit)) || []
  } catch (e) {
    console.warn('Shopify getAllCollections error:', e)
    return []
  }
}

export async function getAllCollectionPaths(
  config: ShopifyBuy.Config,
  limit?: number
): Promise<string[]> {
  const client = getSafeClient(config)
  if (!client) return []
  try {
    // interface need update
    const collections: any[] = (await client.collection.fetchAll(limit)) || []
    return collections.map((val) => val.handle)
  } catch (e) {
    console.warn('Shopify getAllCollectionPaths error:', e)
    return []
  }
}

export async function getCollection(
  config: ShopifyBuy.Config,
  options: { id?: string; handle?: string }
) {
  const client = getSafeClient(config)
  if (!client) return null
  try {
    if (options.handle) {
      return fastClone(await client.collection.fetchByHandle(options.handle))
    }
    if (!options.id) {
      return null
    }
    return fastClone(await client.collection.fetch(options.id))
  } catch (e) {
    console.warn('Shopify getCollection error:', e)
    return null
  }
}

export async function searchProducts(
  config: ShopifyBuy.Config,
  searchString: string
) {
  const client = getSafeClient(config)
  if (!client) return []
  try {
    return (await client.product.fetchQuery({
      query: searchString ? `title:*${searchString}*` : '',
      sortBy: 'title',
    })) || []
  } catch (e) {
    console.warn('Shopify searchProducts error:', e)
    return []
  }
}
