import type { AvaTaxTribalRequest, AvaTaxTribalResponse } from './types.ts'
import { evaluateAddressGeofence } from './geofencing.ts'

export interface AvaTaxConfig {
  accountId?: string
  licenseKey?: string
  companyCode?: string
  environment?: 'sandbox' | 'production'
}

export const AVATAX_ENTITY_USE_CODES = {
  TRIBAL_MEMBER_ON_RESERVATION: 'C',
  COMMERCIAL_RESALE: 'G',
  GOVERNMENT: 'A',
} as const

export async function calculateAvaTaxTribalQuote(
  req: AvaTaxTribalRequest,
  config?: AvaTaxConfig
): Promise<AvaTaxTribalResponse> {
  const {
    customerId,
    isTribalMember,
    onReservation: forcedOnReservation,
    shippingAddress,
    lines,
  } = req

  const subtotal = lines.reduce((acc, line) => acc + line.amount * (line.quantity || 1), 0)

  const geofence = evaluateAddressGeofence({
    address1: shippingAddress.line1,
    city: shippingAddress.city,
    province: shippingAddress.region,
    zip: shippingAddress.postalCode,
    country: shippingAddress.country,
  })

  const effectiveOnReservation =
    typeof forcedOnReservation === 'boolean' ? forcedOnReservation : geofence.onReservation

  const discountAmount = isTribalMember ? Number((subtotal * 0.2).toFixed(2)) : 0
  const taxableBase = Math.max(0, subtotal - discountAmount)

  const isTaxExempt = isTribalMember && effectiveOnReservation
  const entityUseCode = isTaxExempt ? AVATAX_ENTITY_USE_CODES.TRIBAL_MEMBER_ON_RESERVATION : undefined

  const standardStateRate = 0.06
  const standardCountyRate = 0.015
  const standardCityRate = 0.0075

  if (isTaxExempt) {
    if (geofence.isSelfAdministered && geofence.tribalTaxRate) {
      const tribalTax = Number((taxableBase * geofence.tribalTaxRate).toFixed(2))

      return {
        totalAmount: Number((taxableBase + tribalTax).toFixed(2)),
        totalDiscount: discountAmount,
        totalTaxable: taxableBase,
        totalTax: tribalTax,
        entityUseCode,
        isTaxExempt: true,
        isSelfAdministeredTribalTax: true,
        tribalRemittance: {
          applicable: true,
          tribalJurisdiction: geofence.tribalNation || geofence.reservationName,
          tribalTaxAmount: tribalTax,
          tribalTaxRate: geofence.tribalTaxRate,
          directRemittanceRequired: true,
          remittanceInstructions: `Remit ${(geofence.tribalTaxRate * 100).toFixed(1)}% sales tax directly to the ${geofence.tribalNation} Tax Commission. State and local sales taxes are fully exempt.`,
        },
        taxDetails: [
          {
            jurisdictionName: `${shippingAddress.region} State Department of Revenue`,
            jurisdictionType: 'State',
            rate: standardStateRate,
            tax: 0,
            exempt: true,
            exemptionReason: 'Entity Use Code C: Tribal delivery on reservation',
          },
          {
            jurisdictionName: `${shippingAddress.city} County`,
            jurisdictionType: 'County',
            rate: standardCountyRate,
            tax: 0,
            exempt: true,
            exemptionReason: 'Entity Use Code C: Tribal delivery on reservation',
          },
          {
            jurisdictionName: geofence.tribalNation || 'Tribal Government',
            jurisdictionType: 'Tribal',
            rate: geofence.tribalTaxRate,
            tax: tribalTax,
            exempt: false,
          },
        ],
      }
    }

    return {
      totalAmount: taxableBase,
      totalDiscount: discountAmount,
      totalTaxable: 0,
      totalTax: 0,
      entityUseCode,
      isTaxExempt: true,
      isSelfAdministeredTribalTax: false,
      tribalRemittance: {
        applicable: false,
        tribalTaxAmount: 0,
        tribalTaxRate: 0,
        directRemittanceRequired: false,
      },
      taxDetails: [
        {
          jurisdictionName: `${shippingAddress.region} State Department of Revenue`,
          jurisdictionType: 'State',
          rate: standardStateRate,
          tax: 0,
          exempt: true,
          exemptionReason: 'Entity Use Code C: Tribal delivery on reservation (CDTFA-146-RES / WAC 458-20-192)',
        },
        {
          jurisdictionName: `${shippingAddress.city} County / Local`,
          jurisdictionType: 'County',
          rate: standardCountyRate + standardCityRate,
          tax: 0,
          exempt: true,
          exemptionReason: 'Entity Use Code C: Tribal delivery on reservation',
        },
      ],
    }
  }

  const totalCombinedRate = standardStateRate + standardCountyRate + standardCityRate
  const totalTax = Number((taxableBase * totalCombinedRate).toFixed(2))

  return {
    totalAmount: Number((taxableBase + totalTax).toFixed(2)),
    totalDiscount: discountAmount,
    totalTaxable: taxableBase,
    totalTax,
    entityUseCode: undefined,
    isTaxExempt: false,
    isSelfAdministeredTribalTax: false,
    tribalRemittance: {
      applicable: false,
      tribalTaxAmount: 0,
      tribalTaxRate: 0,
      directRemittanceRequired: false,
    },
    taxDetails: [
      {
        jurisdictionName: `${shippingAddress.region} State Department of Revenue`,
        jurisdictionType: 'State',
        rate: standardStateRate,
        tax: Number((taxableBase * standardStateRate).toFixed(2)),
        exempt: false,
      },
      {
        jurisdictionName: `${shippingAddress.city} County`,
        jurisdictionType: 'County',
        rate: standardCountyRate,
        tax: Number((taxableBase * standardCountyRate).toFixed(2)),
        exempt: false,
      },
      {
        jurisdictionName: `${shippingAddress.city} City`,
        jurisdictionType: 'City',
        rate: standardCityRate,
        tax: Number((taxableBase * standardCityRate).toFixed(2)),
        exempt: false,
      },
    ],
  }
}
