import { Cart } from '../types'

export interface CartClientConfig {
  domain: string
  storefrontAccessToken: string
}

const API_VERSION = '2023-07'

const CART_FIELDS_FRAGMENT = `
  fragment CartLineFields on CartLine {
    id
    quantity
    attributes {
      key
      value
    }
    merchandise {
      ... on ProductVariant {
        id
        title
        image {
          url
          altText
        }
        price {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
        product {
          handle
          title
        }
      }
    }
  }
  fragment CartFields on Cart {
    id
    checkoutUrl
    lines(first: 250) {
      edges {
        node {
          ...CartLineFields
        }
      }
    }
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
      totalTaxAmount {
        amount
        currencyCode
      }
    }
  }
`

async function cartFetch<T = any>(
  config: CartClientConfig,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const domain = config.domain.includes('.')
    ? config.domain
    : `${config.domain}.myshopify.com`

  const res = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': config.storefrontAccessToken,
    },
    body: JSON.stringify({ query, variables }),
  })

  const json = await res.json()

  if (json.errors) {
    const message = Array.isArray(json.errors)
      ? json.errors.map((error: any) => error.message).join('; ')
      : String(json.errors)
    throw new Error(`Shopify Storefront API error: ${message}`)
  }

  return json.data
}

function assertNoUserErrors(userErrors: { field?: string[]; message: string }[]) {
  if (userErrors != null && userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join('; '))
  }
}

function mapCart(rawCart: any): Cart {
  const lineItems = (rawCart?.lines?.edges || []).map((edge: any) => {
    const node = edge.node
    const merchandise = node.merchandise || {}

    return {
      id: node.id,
      quantity: node.quantity,
      title: merchandise.product?.title || merchandise.title,
      customAttributes: node.attributes || [],
      variant: {
        id: merchandise.id,
        title: merchandise.title,
        image: merchandise.image
          ? { src: merchandise.image.url, altText: merchandise.image.altText }
          : null,
        priceV2: merchandise.price
          ? {
              amount: merchandise.price.amount,
              currencyCode: merchandise.price.currencyCode,
            }
          : null,
        selectedOptions: merchandise.selectedOptions || [],
        product: merchandise.product
          ? { handle: merchandise.product.handle }
          : undefined,
      },
    }
  })

  return {
    id: rawCart.id,
    webUrl: rawCart.checkoutUrl,
    lineItems,
    subtotalPrice: rawCart.cost?.subtotalAmount?.amount,
    totalPrice: rawCart.cost?.totalAmount?.amount,
    totalTax: rawCart.cost?.totalTaxAmount?.amount,
    currencyCode: rawCart.cost?.totalAmount?.currencyCode,
  }
}

export async function createCart(config: CartClientConfig): Promise<Cart> {
  const data = await cartFetch(
    config,
    `${CART_FIELDS_FRAGMENT}
    mutation cartCreate($input: CartInput) {
      cartCreate(input: $input) {
        cart {
          ...CartFields
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { input: {} }
  )
  assertNoUserErrors(data.cartCreate.userErrors)
  return mapCart(data.cartCreate.cart)
}

export async function fetchCart(
  config: CartClientConfig,
  cartId: string
): Promise<Cart | null> {
  const data = await cartFetch(
    config,
    `${CART_FIELDS_FRAGMENT}
    query cartQuery($cartId: ID!) {
      cart(id: $cartId) {
        ...CartFields
      }
    }`,
    { cartId }
  )
  if (data.cart == null) {
    return null
  }
  return mapCart(data.cart)
}

export async function addLinesToCart(
  config: CartClientConfig,
  cartId: string,
  items: { variantId: string | number; quantity: number; customAttributes?: unknown }[]
): Promise<Cart> {
  const lines = items.map((item) => ({
    merchandiseId: String(item.variantId),
    quantity: item.quantity,
    attributes: item.customAttributes,
  }))

  const data = await cartFetch(
    config,
    `${CART_FIELDS_FRAGMENT}
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          ...CartFields
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { cartId, lines }
  )
  assertNoUserErrors(data.cartLinesAdd.userErrors)
  return mapCart(data.cartLinesAdd.cart)
}

export async function removeLinesFromCart(
  config: CartClientConfig,
  cartId: string,
  lineIds: string[]
): Promise<Cart> {
  const data = await cartFetch(
    config,
    `${CART_FIELDS_FRAGMENT}
    mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          ...CartFields
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { cartId, lineIds }
  )
  assertNoUserErrors(data.cartLinesRemove.userErrors)
  return mapCart(data.cartLinesRemove.cart)
}

export async function updateLinesInCart(
  config: CartClientConfig,
  cartId: string,
  lines: { id: string; quantity: number }[]
): Promise<Cart> {
  const data = await cartFetch(
    config,
    `${CART_FIELDS_FRAGMENT}
    mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          ...CartFields
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { cartId, lines }
  )
  assertNoUserErrors(data.cartLinesUpdate.userErrors)
  return mapCart(data.cartLinesUpdate.cart)
}
