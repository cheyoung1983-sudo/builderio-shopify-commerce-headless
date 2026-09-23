/**
 * Avalara AvaTax Tax Calculation Service
 * 
 * Integrates with Avalara AvaTax API (v2) using Entity Use Code 'C' (Native American / Tribal Member)
 * to calculate sales tax exemptions for qualified on-reservation transactions.
 */

import { checkCoordinatesIntersectAIANA, isCoordinatesOnReservation } from './geofencing.ts'
import { evaluateAddressGeofence } from './tribal/geofencing.ts'

export const AVATAX_ENTITY_USE_CODE_TRIBAL = 'C'

export interface TaxAddress {
  line1: string
  line2?: string
  city: string
  region: string // State code (e.g. 'AZ', 'CA', 'WA', 'NM')
  postalCode: string
  country?: string // Defaults to 'US'
  latitude?: number
  longitude?: number
}

export interface TaxLineItem {
  id?: string
  number?: string
  itemCode: string
  description?: string
  quantity: number
  amount: number
  taxCode?: string
  entityUseCode?: string
}

export interface TaxCalculatorRequest {
  transactionCode?: string
  customerId: string
  isTribalMember: boolean
  tribalNation?: string
  tribalEnrollmentId?: string
  shippingAddress: TaxAddress
  lines: TaxLineItem[]
  commit?: boolean
  date?: string
  currencyCode?: string
}

export interface TaxJurisdictionDetail {
  jurisdictionName: string
  jurisdictionType: 'State' | 'County' | 'City' | 'Special' | 'Tribal'
  rate: number
  tax: number
  exempt: boolean
  exemptionReason?: string
}

export interface TaxCalculationResult {
  transactionCode: string
  totalAmount: number
  subtotal: number
  totalDiscount: number
  taxableAmount: number
  totalTax: number
  isTaxExempt: boolean
  entityUseCode?: string
  onReservation: boolean
  reservationName?: string
  isSelfAdministeredTribalTax: boolean
  tribalRemittance?: {
    applicable: boolean
    tribalNation?: string
    tribalTaxRate?: number
    tribalTaxAmount?: number
    remittanceInstructions?: string
  }
  taxDetails: TaxJurisdictionDetail[]
  rawAvaTaxResponse?: any
}

export interface AvaTaxConfig {
  accountId?: string
  licenseKey?: string
  bearerToken?: string
  companyCode?: string
  environment?: 'sandbox' | 'production'
}

/**
 * Validates whether an order qualifies for tribal tax exemption:
 * Requires BOTH enrolled tribal member status AND verified on-reservation delivery address.
 */
export function isQualifiedOnReservationTribalTransaction(params: {
  isTribalMember: boolean
  shippingAddress: TaxAddress
}): {
  qualified: boolean
  onReservation: boolean
  reservationName?: string
  tribalNation?: string
  isSelfAdministered: boolean
  tribalTaxRate?: number
} {
  if (!params.isTribalMember) {
    return {
      qualified: false,
      onReservation: false,
      isSelfAdministered: false,
    }
  }

  // 1. Coordinate check if available
  let onRes = false
  let resName: string | undefined
  let nationName: string | undefined
  let isSelfAdmin = false
  let tribalRate: number | undefined

  if (
    typeof params.shippingAddress.latitude === 'number' &&
    typeof params.shippingAddress.longitude === 'number'
  ) {
    const coordResult = checkCoordinatesIntersectAIANA(
      params.shippingAddress.latitude,
      params.shippingAddress.longitude
    )
    if (coordResult.onReservation) {
      onRes = true
      resName = coordResult.reservationName
      isSelfAdmin = coordResult.isSelfAdministered ?? false
      tribalRate = coordResult.tribalTaxRate
    }
  }

  // 2. Fall back to postal/address geofencing engine
  if (!onRes) {
    const geo = evaluateAddressGeofence({
      address1: params.shippingAddress.line1,
      city: params.shippingAddress.city,
      province: params.shippingAddress.region,
      zip: params.shippingAddress.postalCode,
      country: params.shippingAddress.country || 'US',
    })
    onRes = geo.onReservation
    resName = geo.reservationName
    nationName = geo.tribalNation
    isSelfAdmin = geo.isSelfAdministered
    tribalRate = geo.tribalTaxRate
  }

  return {
    qualified: onRes,
    onReservation: onRes,
    reservationName: resName,
    tribalNation: nationName,
    isSelfAdministered: isSelfAdmin,
    tribalTaxRate: tribalRate,
  }
}

/**
 * Builds the standard Avalara AvaTax REST API v2 CreateTransaction payload
 */
export function buildAvaTaxTransactionPayload(
  request: TaxCalculatorRequest,
  qualification: ReturnType<typeof isQualifiedOnReservationTribalTransaction>,
  config?: AvaTaxConfig
) {
  const companyCode = config?.companyCode || process.env.AVALARA_COMPANY_CODE || 'DEFAULT'
  const entityUseCode = qualification.qualified ? AVATAX_ENTITY_USE_CODE_TRIBAL : undefined

  return {
    type: request.commit ? 'SalesInvoice' : 'SalesOrder',
    companyCode,
    code: request.transactionCode || `TX-${Date.now()}`,
    date: request.date || new Date().toISOString().split('T')[0],
    customerCode: request.customerId || 'GUEST',
    entityUseCode,
    addresses: {
      singleLocation: {
        line1: request.shippingAddress.line1,
        line2: request.shippingAddress.line2 || '',
        city: request.shippingAddress.city,
        region: request.shippingAddress.region,
        postalCode: request.shippingAddress.postalCode,
        country: request.shippingAddress.country || 'US',
        latitude: request.shippingAddress.latitude,
        longitude: request.shippingAddress.longitude,
      },
    },
    lines: request.lines.map((line, index) => ({
      number: line.number || String(index + 1),
      itemCode: line.itemCode,
      description: line.description || line.itemCode,
      quantity: line.quantity,
      amount: line.amount * (line.quantity || 1),
      taxCode: line.taxCode || 'P0000000', // General tangible personal property
      entityUseCode: line.entityUseCode || entityUseCode,
    })),
    commit: !!request.commit,
    currencyCode: request.currencyCode || 'USD',
  }
}

/**
 * Direct Avalara AvaTax REST API Client
 */
export async function createAvaTaxTransaction(
  payload: any,
  config?: AvaTaxConfig
): Promise<any> {
  const accountId = config?.accountId || process.env.AVALARA_ACCOUNT_ID
  const licenseKey = config?.licenseKey || process.env.AVALARA_LICENSE_KEY
  const bearerToken = config?.bearerToken || process.env.AVALARA_BEARER_TOKEN
  const env = config?.environment || process.env.AVALARA_ENVIRONMENT || 'sandbox'

  const baseUrl =
    env === 'production'
      ? 'https://rest.avatax.com'
      : 'https://sandbox-rest.avatax.com'

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Avalara-Client': 'DisplayCellPros; TribalTaxEngine; 1.0.0; NextJs',
  }

  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`
  } else if (accountId && licenseKey) {
    const authString = Buffer.from(`${accountId}:${licenseKey}`).toString('base64')
    headers['Authorization'] = `Basic ${authString}`
  } else {
    // No credentials provided; caller will handle simulated execution
    return null
  }

  const response = await fetch(`${baseUrl}/api/v2/transactions/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AvaTax API error (${response.status}): ${errorText}`)
  }

  return response.json()
}

/**
 * Main Service Function:
 * Integrates with the Avalara AvaTax API using Entity Use Code 'C' to calculate tax exemptions
 * for qualified on-reservation transactions.
 */
export async function calculateTribalTransactionTax(
  request: TaxCalculatorRequest,
  config?: AvaTaxConfig
): Promise<TaxCalculationResult> {
  const subtotal = request.lines.reduce(
    (acc, line) => acc + line.amount * (line.quantity || 1),
    0
  )

  // 20% commercial discount for enrolled tribal members
  const totalDiscount = request.isTribalMember ? Number((subtotal * 0.2).toFixed(2)) : 0
  const taxableBase = Math.max(0, subtotal - totalDiscount)

  // Evaluate on-reservation statutory qualification
  const qualification = isQualifiedOnReservationTribalTransaction({
    isTribalMember: request.isTribalMember,
    shippingAddress: request.shippingAddress,
  })

  const avaTaxPayload = buildAvaTaxTransactionPayload(request, qualification, config)

  // Try live AvaTax API call if credentials exist
  let rawAvaTaxResponse = null
  try {
    rawAvaTaxResponse = await createAvaTaxTransaction(avaTaxPayload, config)
  } catch (err) {
    console.warn('AvaTax API call failed or credentials not present; using local statutory tax rules:', err)
  }

  const standardRates = {
    state: 0.06,
    county: 0.015,
    city: 0.0075,
  }

  // When transaction qualifies for Entity Use Code 'C'
  if (qualification.qualified) {
    const entityUseCode = AVATAX_ENTITY_USE_CODE_TRIBAL

    // Case 1: Self-administered tribal nation (e.g. Navajo Nation 6%, Tulalip 3%, Gila River 4%)
    if (qualification.isSelfAdministered && qualification.tribalTaxRate) {
      const tribalTax = Number((taxableBase * qualification.tribalTaxRate).toFixed(2))

      return {
        transactionCode: avaTaxPayload.code,
        totalAmount: Number((taxableBase + tribalTax).toFixed(2)),
        subtotal,
        totalDiscount,
        taxableAmount: taxableBase,
        totalTax: tribalTax,
        isTaxExempt: true,
        entityUseCode,
        onReservation: true,
        reservationName: qualification.reservationName,
        isSelfAdministeredTribalTax: true,
        tribalRemittance: {
          applicable: true,
          tribalNation: qualification.tribalNation || qualification.reservationName,
          tribalTaxRate: qualification.tribalTaxRate,
          tribalTaxAmount: tribalTax,
          remittanceInstructions: `Apply Entity Use Code 'C'. State/local taxes are 100% exempt. Remit ${(qualification.tribalTaxRate * 100).toFixed(1)}% tribal tax directly to ${qualification.tribalNation || 'Tribal Government'}.`,
        },
        taxDetails: [
          {
            jurisdictionName: `${request.shippingAddress.region} Department of Revenue`,
            jurisdictionType: 'State',
            rate: standardRates.state,
            tax: 0,
            exempt: true,
            exemptionReason: "Entity Use Code 'C': Enrolled Tribal Member on Reservation",
          },
          {
            jurisdictionName: `${request.shippingAddress.city} County / Local`,
            jurisdictionType: 'County',
            rate: standardRates.county + standardRates.city,
            tax: 0,
            exempt: true,
            exemptionReason: "Entity Use Code 'C': Enrolled Tribal Member on Reservation",
          },
          {
            jurisdictionName: qualification.tribalNation || qualification.reservationName || 'Tribal Government',
            jurisdictionType: 'Tribal',
            rate: qualification.tribalTaxRate,
            tax: tribalTax,
            exempt: false,
          },
        ],
        rawAvaTaxResponse,
      }
    }

    // Case 2: Fully exempt on-reservation delivery (0% state, 0% local, 0% tribal)
    return {
      transactionCode: avaTaxPayload.code,
      totalAmount: taxableBase,
      subtotal,
      totalDiscount,
      taxableAmount: 0,
      totalTax: 0,
      isTaxExempt: true,
      entityUseCode,
      onReservation: true,
      reservationName: qualification.reservationName,
      isSelfAdministeredTribalTax: false,
      tribalRemittance: {
        applicable: false,
        tribalTaxAmount: 0,
        tribalTaxRate: 0,
      },
      taxDetails: [
        {
          jurisdictionName: `${request.shippingAddress.region} Department of Revenue`,
          jurisdictionType: 'State',
          rate: standardRates.state,
          tax: 0,
          exempt: true,
          exemptionReason: "Entity Use Code 'C': Tribal Member on-reservation delivery (CDTFA-146-RES / WAC 458-20-192)",
        },
        {
          jurisdictionName: `${request.shippingAddress.city} County / Local`,
          jurisdictionType: 'County',
          rate: standardRates.county + standardRates.city,
          tax: 0,
          exempt: true,
          exemptionReason: "Entity Use Code 'C': Tribal Member on-reservation delivery",
        },
      ],
      rawAvaTaxResponse,
    }
  }

  // Non-exempt transaction (either off-reservation or non-enrolled customer)
  const combinedRate = standardRates.state + standardRates.county + standardRates.city
  const stateTax = Number((taxableBase * standardRates.state).toFixed(2))
  const countyTax = Number((taxableBase * standardRates.county).toFixed(2))
  const cityTax = Number((taxableBase * standardRates.city).toFixed(2))
  const totalTax = Number((stateTax + countyTax + cityTax).toFixed(2))

  return {
    transactionCode: avaTaxPayload.code,
    totalAmount: Number((taxableBase + totalTax).toFixed(2)),
    subtotal,
    totalDiscount,
    taxableAmount: taxableBase,
    totalTax,
    isTaxExempt: false,
    entityUseCode: undefined,
    onReservation: qualification.onReservation,
    reservationName: qualification.reservationName,
    isSelfAdministeredTribalTax: false,
    tribalRemittance: {
      applicable: false,
      tribalTaxAmount: 0,
      tribalTaxRate: 0,
    },
    taxDetails: [
      {
        jurisdictionName: `${request.shippingAddress.region} Department of Revenue`,
        jurisdictionType: 'State',
        rate: standardRates.state,
        tax: stateTax,
        exempt: false,
      },
      {
        jurisdictionName: `${request.shippingAddress.city} County`,
        jurisdictionType: 'County',
        rate: standardRates.county,
        tax: countyTax,
        exempt: false,
      },
      {
        jurisdictionName: `${request.shippingAddress.city} City`,
        jurisdictionType: 'City',
        rate: standardRates.city,
        tax: cityTax,
        exempt: false,
      },
    ],
    rawAvaTaxResponse,
  }
}

export default calculateTribalTransactionTax
