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

export interface TribalVerificationResult {
  verified: boolean
  customerId?: string
  customerTagApplied: boolean // 'tribal-member-verified'
  discountTrack: {
    eligible: boolean
    discountPercentage: number // 20
    shopifyDiscountId: string // '1826009317748'
    code: string // 'TRIBAL-MEMBER-20'
    message: string
  }
  taxExemptionTrack: {
    eligible: boolean
    taxExempt: boolean
    taxExemptionCode: 'EXEMPT_INDIAN_IN_CANADA_OR_USA' | null
    onReservation: boolean
    reservationName?: string
    entityUseCode?: 'C'
    requiresCertificate: boolean
    certificateCompleted: boolean
    isSelfAdministered: boolean
    tribalTaxRate?: number
    message: string
  }
  audit: {
    verificationHash: string
    verifiedAt: string
    provider: string
    tribalNation: string
    maskedEnrollmentId: string
    certificateRef?: string
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

export type QAScenarioName =
  | 'ENROLLED_ON_RESERVATION'
  | 'ENROLLED_OFF_RESERVATION'
  | 'NOT_ENROLLED_ON_RESERVATION'
  | 'NOT_ENROLLED_OFF_RESERVATION'

export interface QAMatrixEvaluation {
  scenario: QAScenarioName
  description: string
  enrolled: boolean
  onReservation: boolean
  expectedDiscount: boolean
  expectedDiscountPercent: number
  expectedTaxExempt: boolean
  expectedEntityUseCode: string | null
  expectedCustomerTag: string | null
  actualResults: {
    discountApplied: boolean
    discountPercent: number
    taxExemptApplied: boolean
    entityUseCode: string | null
    customerTag: string | null
    passed: boolean
  }
}
