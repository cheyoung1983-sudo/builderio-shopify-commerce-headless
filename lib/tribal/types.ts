/**
 * Tribal Tax Exemption & Identity Discount System - Type Definitions
 * Display & Cell Pros
 */

export interface TribalNation {
  id: string
  name: string
  state: string
  isFederallyRecognized: boolean
  isSelfAdministered: boolean
  tribalTaxRate?: number
  aianaCode?: string
  reservationName?: string
  zipCodes?: string[]
}

export interface TribalVerificationRequest {
  customerId?: string
  email?: string
  firstName: string
  lastName: string
  birthDate?: string // YYYY-MM-DD
  tribalNation: string
  tribalEnrollmentId: string
  provider?: 'sheerid' | 'idme' | 'registry'
  shippingAddress?: {
    address1: string
    address2?: string
    city: string
    province: string // state code, e.g. 'CA', 'WA', 'AZ'
    zip: string
    country?: string
  }
  certificate?: {
    formType: 'CDTFA-146-RES' | 'WAC-458-20-192' | 'GENERAL_TRIBAL_EXEMPTION'
    signatureBase64: string
    carrierDeliveryMethod: 'COMMON_CARRIER' | 'SELLER_DELIVERY' | 'FOB_RESERVATION'
    deliveryConfirmationRef?: string
    signedDate: string
  }
}

export interface GeofenceResult {
  onReservation: boolean
  reservationName?: string
  aianaCode?: string
  tribalNation?: string
  isSelfAdministered: boolean
  tribalTaxRate?: number
  stateJurisdiction: string
  normalizedAddress?: {
    street: string
    city: string
    state: string
    zip: string
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  message: string
}

export interface AvaTaxTribalRequest {
  transactionCode: string
  customerId: string
  customerEmail: string
  isTribalMember: boolean
  onReservation: boolean
  shippingAddress: {
    line1: string
    line2?: string
    city: string
    region: string
    postalCode: string
    country: string
  }
  lines: Array<{
    number: string
    quantity: number
    amount: number
    taxCode: string
    itemCode: string
    description: string
  }>
}

export interface AvaTaxTribalResponse {
  totalAmount: number
  totalDiscount: number
  totalTaxable: number
  totalTax: number
  entityUseCode?: string
  isTaxExempt: boolean
  isSelfAdministeredTribalTax: boolean
  tribalRemittance: {
    applicable: boolean
    tribalJurisdiction?: string
    tribalTaxAmount: number
    tribalTaxRate: number
    directRemittanceRequired: boolean
    remittanceInstructions?: string
  }
  taxDetails: Array<{
    jurisdictionName: string
    jurisdictionType: 'State' | 'County' | 'City' | 'Special' | 'Tribal'
    rate: number
    tax: number
    exempt: boolean
    exemptionReason?: string
  }>
}

export interface SignedCertificateRecord {
  id: string
  customerId: string
  formType: 'CDTFA-146-RES' | 'WAC-458-20-192' | 'GENERAL_TRIBAL_EXEMPTION'
  state: string
  tribalNation: string
  enrollmentIdMasked: string
  deliveryAddress: string
  carrierDeliveryMethod: string
  signatureHash: string
  signedAt: string
  expiresAt: string
  documentRef: string
}
