export type SupplierName = 'MobileSentrix' | 'InjuredGadgets'

export interface SupplierRawProduct {
  vendor_sku: string
  name: string
  supplier: SupplierName
  wholesale_cost: number
  map_price: number
  quantity_available: number
  device_compatibility: string[]
  weight_oz: number
  category: string
}

export interface TransformedShopifyVariant {
  sku: string
  title: string
  supplier: SupplierName
  wholesaleCost: number
  mapPrice: number
  retailPrice: number
  supplierQuantity: number
  safetyBuffer: number
  shopifyAvailableQuantity: number
  weightOz: number
  compatibility: string[]
  marginPercentage: number
  status: 'active' | 'out_of_stock' | 'flagged_margin_exceeded'
}

export interface WholesaleOrderRoutingPayload {
  orderId: string
  lineItems: {
    sku: string
    quantity: number
    wholesaleCost: number
    supplier: SupplierName
  }[]
  shippingAddress: {
    address1: string
    city: string
    province: string
    zip: string
    country: string
  }
  customerEmail: string
}

export interface PurchaseOrderRecord {
  poNumber: string
  supplier: SupplierName
  status: 'transmitted' | 'acknowledged' | 'shipped' | 'exception'
  createdAt: string
  blindDropship: boolean
  trackingNumber?: string
  carrier?: string
  items: { sku: string; quantity: number }[]
}
