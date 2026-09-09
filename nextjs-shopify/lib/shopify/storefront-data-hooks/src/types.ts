export interface AttributeInput {
  [key: string]: string
}

export interface LineItemPatch {
  variantId: string | number
  quantity: number
  customAttributes?: AttributeInput[]
}

export interface CartLineItemImage {
  src: string
  altText?: string | null
}

export interface CartLineItemVariant {
  id: string
  title?: string
  image?: CartLineItemImage | null
  priceV2: {
    amount: string
    currencyCode: string
  } | null
  selectedOptions: { name: string; value: string }[]
  product?: { handle: string }
}

export interface CartLineItem {
  id: string
  quantity: number
  title?: string
  customAttributes: AttributeInput[]
  variant: CartLineItemVariant
}

export interface Cart {
  id: string
  webUrl: string
  lineItems: CartLineItem[]
  subtotalPrice?: string
  totalPrice?: string
  totalTax?: string
  currencyCode?: string
}
