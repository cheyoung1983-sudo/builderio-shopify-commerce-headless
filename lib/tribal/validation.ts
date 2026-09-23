/**
 * Tribal Exemption Certificate Zod Validation Schemas
 * 
 * Enforces strict format checks for:
 * 1. Tribal Enrollment / Census Roll IDs (alphanumeric, anti-dummy, anti-injection)
 * 2. State-Required Document Fields (CDTFA-146-RES for CA, WAC 458-20-192 for WA, etc.)
 * 3. On-reservation physical delivery address and state-to-ZIP cross validation
 * 4. Carrier delivery method proof (Common Carrier, Seller Fleet, F.O.B. Reservation)
 * 5. Digital declaration signature & statutory perjury affirmation
 */

import { z } from 'zod'
import { getRequiredCertificateType } from './certificates.ts'

// Known state ZIP code ranges for tribal land exemption states
export const STATE_ZIP_RANGES: Record<
  string,
  { name: string; prefixRegex: RegExp; min: number; max: number; formCode?: string }
> = {
  CA: {
    name: 'California',
    prefixRegex: /^9[0-6]\d{3}$/,
    min: 90000,
    max: 96162,
    formCode: 'CDTFA-146-RES',
  },
  WA: {
    name: 'Washington',
    prefixRegex: /^9[89]\d{3}$/,
    min: 98000,
    max: 99403,
    formCode: 'WAC-458-20-192',
  },
  AZ: {
    name: 'Arizona',
    prefixRegex: /^8[56]\d{3}$/,
    min: 85000,
    max: 86556,
  },
  NM: {
    name: 'New Mexico',
    prefixRegex: /^8[78]\d{3}$/,
    min: 87000,
    max: 88439,
  },
  OK: {
    name: 'Oklahoma',
    prefixRegex: /^7[34]\d{3}$/,
    min: 73000,
    max: 74966,
  },
  MT: {
    name: 'Montana',
    prefixRegex: /^59\d{3}$/,
    min: 59000,
    max: 59937,
  },
  SD: {
    name: 'South Dakota',
    prefixRegex: /^57\d{3}$/,
    min: 57000,
    max: 57799,
  },
  ND: {
    name: 'North Dakota',
    prefixRegex: /^58\d{3}$/,
    min: 58000,
    max: 58856,
  },
  NV: {
    name: 'Nevada',
    prefixRegex: /^89\d{3}$/,
    min: 89000,
    max: 89883,
  },
  OR: {
    name: 'Oregon',
    prefixRegex: /^97\d{3}$/,
    min: 97000,
    max: 97920,
  },
  MN: {
    name: 'Minnesota',
    prefixRegex: /^5[56]\d{3}$/,
    min: 55000,
    max: 56763,
  },
  WI: {
    name: 'Wisconsin',
    prefixRegex: /^5[34]\d{3}$/,
    min: 53000,
    max: 54990,
  },
}

// Disallowed dummy or placeholder values for Tribal IDs
const DUMMY_TRIBAL_IDS = new Set([
  '0000',
  '00000',
  '000000',
  '1111',
  '11111',
  '1234',
  '12345',
  '9999',
  '99999',
  'TEST',
  'NONE',
  'N/A',
  'NA',
  'INVALID',
  'DUMMY',
  'SAMPLE',
  'UNKNOWN',
  'NULL',
  'UNDEFINED',
  'VOID',
  'XXXX',
  'XXXXX',
  'XXXXXX',
  'ASDF',
  'QWERTY',
])

/**
 * Strict Tribal Enrollment / Census Roll ID Schema
 * 
 * Enforces:
 * - 3 to 30 characters
 * - Alphanumeric characters with optional hyphens, slashes, or spaces
 * - Rejects SQL / HTML injection symbols (<, >, ;, ", ', *, %, @)
 * - Rejects dummy/placeholder values and monotonous single-character repeats
 */
export const tribalIdSchema = z
  .string({ message: 'Tribal Enrollment / Census Roll ID is required.' })
  .trim()
  .min(3, { message: 'Tribal Enrollment ID must be at least 3 characters.' })
  .max(30, { message: 'Tribal Enrollment ID cannot exceed 30 characters.' })
  .refine(
    (val) => {
      // Must not contain disallowed symbols / injection attempts
      return !/[<>;*%"'#&()=!]/.test(val)
    },
    { message: 'Tribal Enrollment ID contains invalid or prohibited characters.' }
  )
  .refine(
    (val) => {
      // Must match valid tribal enrollment numbering pattern
      return /^[A-Za-z0-9][A-Za-z0-9\-\/\s]{1,28}[A-Za-z0-9]$|^[A-Za-z0-9]{3,30}$/.test(val)
    },
    { message: 'Invalid Tribal ID format. Must contain alphanumeric characters (hyphens or slashes allowed, e.g. NAV-98442).' }
  )
  .refine(
    (val) => {
      const normalized = val.toUpperCase().replace(/[\s\-_/]/g, '')
      if (
        DUMMY_TRIBAL_IDS.has(val.toUpperCase()) ||
        DUMMY_TRIBAL_IDS.has(normalized) ||
        /(INVALID|TEST_FAIL|DUMMY|SAMPLE|PLACEHOLDER|FAKE)/i.test(val)
      ) {
        return false
      }
      // Check for single character repeats like "00000", "AAAAA"
      if (/^(.)\1+$/.test(normalized) && normalized.length >= 4) {
        return false
      }
      return true
    },
    { message: 'Tribal Enrollment ID cannot be a placeholder or dummy value.' }
  )

/**
 * Physical Delivery Address Schema
 */
export const deliveryAddressSchema = z.object({
  address1: z
    .string({ message: 'Physical on-reservation street address is required.' })
    .trim()
    .min(5, { message: 'Physical street address must be at least 5 characters.' })
    .max(120, { message: 'Physical address cannot exceed 120 characters.' }),
  city: z
    .string({ message: 'City or reservation community is required.' })
    .trim()
    .min(2, { message: 'City must be at least 2 characters.' })
    .max(60, { message: 'City cannot exceed 60 characters.' }),
  state: z
    .string({ message: 'State is required.' })
    .trim()
    .length(2, { message: 'State must be a 2-letter postal code.' })
    .transform((val) => val.toUpperCase()),
  zip: z
    .string({ message: 'ZIP Code is required.' })
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, { message: 'ZIP Code must be a valid 5-digit (or 5+4) postal code.' }),
})

const CARRIER_DELIVERY_METHODS = ['COMMON_CARRIER', 'SELLER_DELIVERY', 'FOB_RESERVATION'] as const

/**
 * Full Exemption Certificate Form Validation Schema
 */
export const exemptionCertificateSchema = z
  .object({
    customerId: z.string().optional().default('guest'),
    customerName: z
      .string({ message: 'Full legal name of enrolled member is required.' })
      .trim()
      .min(2, { message: 'Full legal name must be at least 2 characters.' })
      .max(100, { message: 'Full legal name cannot exceed 100 characters.' })
      .regex(/^[A-Za-zÀ-ÿ\s'\-\.]{2,100}$/, { message: 'Full legal name contains invalid characters.' }),
    customerEmail: z
      .string({ message: 'Contact email is required.' })
      .trim()
      .email({ message: 'Please provide a valid contact email address.' }),
    tribalNation: z
      .string({ message: 'Federally recognized tribe or nation is required.' })
      .trim()
      .min(3, { message: 'Tribal nation name must be at least 3 characters.' })
      .max(100, { message: 'Tribal nation name cannot exceed 100 characters.' }),
    enrollmentId: tribalIdSchema,
    reservationName: z.string().optional().default(''),
    deliveryAddress: deliveryAddressSchema,
    carrierDeliveryMethod: z.enum(CARRIER_DELIVERY_METHODS, {
      message: 'Please select a valid carrier delivery method (Common Carrier, Seller Fleet, or F.O.B.).',
    }),
    deliveryConfirmationRef: z.string().optional().default(''),
    signatureBase64: z
      .string({ message: 'A digital declaration signature is required.' })
      .trim()
      .min(20, { message: 'A digital declaration signature is required.' })
      .refine(
        (val) => /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(val),
        { message: 'Digital signature must be a valid drawn signature image.' }
      ),
    signedDate: z.string().optional(),
    statutoryAffirmation: z.literal(true, {
      message: 'You must certify the statutory legal declaration under penalty of perjury.',
    }),
  })
  .superRefine((data, ctx) => {
    const state = data.deliveryAddress.state.toUpperCase()
    const zipDigits = data.deliveryAddress.zip.split('-')[0]
    const zipNum = parseInt(zipDigits, 10)

    const stateConfig = STATE_ZIP_RANGES[state]

    // 1. Cross-validate delivery ZIP against state postal range
    if (stateConfig) {
      const isPrefixMatch = stateConfig.prefixRegex.test(zipDigits)
      const isRangeMatch = zipNum >= stateConfig.min && zipNum <= stateConfig.max

      if (!isPrefixMatch || !isRangeMatch) {
        const formDesc = stateConfig.formCode ? ` (${stateConfig.formCode})` : ''
        ctx.addIssue({
          code: 'custom',
          message: `Delivery state is ${stateConfig.name}${formDesc}, but ZIP code ${data.deliveryAddress.zip} is not located in ${stateConfig.name}.`,
          path: ['deliveryAddress', 'zip'],
        })
      }
    }

    // 2. State-required statutory document fields
    const resName = (data.reservationName || '').trim()

    // California CDTFA-146-RES requires specific Reservation or Rancheria identification
    if (state === 'CA') {
      if (!resName) {
        ctx.addIssue({
          code: 'custom',
          message: 'Reservation or Rancheria name is required for California exemption (CDTFA-146-RES).',
          path: ['reservationName'],
        })
      }
    }

    // Washington WAC 458-20-192 requires Indian Country / Reservation tract designation
    if (state === 'WA') {
      if (!resName) {
        ctx.addIssue({
          code: 'custom',
          message: 'Reservation or Indian Country name is required for Washington exemption (WAC 458-20-192).',
          path: ['reservationName'],
        })
      }
    }

    // Check reservation name for safety and length if provided
    if (resName) {
      if (/[<>;*%"'#&()=!]/.test(resName)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Reservation name contains invalid or prohibited characters.',
          path: ['reservationName'],
        })
      } else if (resName.length > 100) {
        ctx.addIssue({
          code: 'custom',
          message: 'Reservation name cannot exceed 100 characters.',
          path: ['reservationName'],
        })
      }
    }

    // 3. Delivery confirmation / Bill of Lading format check when provided
    const deliveryRef = (data.deliveryConfirmationRef || '').trim()
    if (deliveryRef) {
      if (/[<>;*%"'#&()=!]/.test(deliveryRef)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Delivery tracking reference contains invalid or prohibited characters.',
          path: ['deliveryConfirmationRef'],
        })
      } else if (deliveryRef.length < 3 || deliveryRef.length > 60) {
        ctx.addIssue({
          code: 'custom',
          message: 'Delivery tracking reference must be between 3 and 60 characters.',
          path: ['deliveryConfirmationRef'],
        })
      }
    }
  })

export type ExemptionCertificateValidatedData = z.infer<typeof exemptionCertificateSchema>

export interface ExemptionCertificateValidationResult {
  success: boolean
  data?: ExemptionCertificateValidatedData
  errors?: Record<string, string>
  formType: 'CDTFA-146-RES' | 'WAC-458-20-192' | 'GENERAL_TRIBAL_EXEMPTION'
}

/**
 * Validates exemption certificate form data and returns formatted field-level errors
 */
export function validateExemptionCertificate(
  input: unknown
): ExemptionCertificateValidationResult {
  const result = exemptionCertificateSchema.safeParse(input)

  const state =
    typeof input === 'object' && input !== null && 'deliveryAddress' in input
      ? (input as any).deliveryAddress?.state || 'US'
      : 'US'

  const formType = getRequiredCertificateType(state)

  if (!result.success) {
    const errors: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const pathKey = issue.path.join('.')
      if (!errors[pathKey]) {
        errors[pathKey] = issue.message
      }
    }

    return {
      success: false,
      errors,
      formType,
    }
  }

  return {
    success: true,
    data: result.data,
    formType,
  }
}

/**
 * Real-time field-level validator for ExemptionCertificateForm
 * Provides instant feedback before submission on blur or change
 */
export function validateCertificateField(
  field: string,
  value: unknown,
  formContext?: {
    deliveryAddress?: { state?: string; zip?: string }
    carrierDeliveryMethod?: string
  }
): string | null {
  const state = (formContext?.deliveryAddress?.state || '').toUpperCase().trim()

  switch (field) {
    case 'customerName': {
      if (!value || typeof value !== 'string' || !value.trim()) {
        return 'Full legal name of enrolled member is required.'
      }
      const trimmed = value.trim()
      if (trimmed.length < 2) return 'Full legal name must be at least 2 characters.'
      if (trimmed.length > 100) return 'Full legal name cannot exceed 100 characters.'
      if (!/^[A-Za-zÀ-ÿ\s'\-\.]{2,100}$/.test(trimmed)) {
        return 'Full legal name contains invalid characters.'
      }
      return null
    }

    case 'customerEmail': {
      if (!value || typeof value !== 'string' || !value.trim()) {
        return 'Contact email is required.'
      }
      const res = z.string().email().safeParse(value.trim())
      if (!res.success) return 'Please provide a valid contact email address.'
      return null
    }

    case 'tribalNation': {
      if (!value || typeof value !== 'string' || !value.trim()) {
        return 'Federally recognized tribe or nation is required.'
      }
      const trimmed = value.trim()
      if (trimmed.length < 3) return 'Tribal nation name must be at least 3 characters.'
      if (trimmed.length > 100) return 'Tribal nation name cannot exceed 100 characters.'
      return null
    }

    case 'enrollmentId': {
      const res = tribalIdSchema.safeParse(value)
      if (!res.success) {
        return res.error.issues[0]?.message || 'Invalid Tribal Enrollment ID format.'
      }
      return null
    }

    case 'reservationName': {
      const trimmed = typeof value === 'string' ? value.trim() : ''
      if (state === 'CA' && !trimmed) {
        return 'Reservation or Rancheria name is required for California exemption (CDTFA-146-RES).'
      }
      if (state === 'WA' && !trimmed) {
        return 'Reservation or Indian Country name is required for Washington exemption (WAC 458-20-192).'
      }
      if (trimmed) {
        if (/[<>;*%"'#&()=!]/.test(trimmed)) {
          return 'Reservation name contains invalid or prohibited characters.'
        }
        if (trimmed.length > 100) {
          return 'Reservation name cannot exceed 100 characters.'
        }
      }
      return null
    }

    case 'deliveryAddress.address1': {
      if (!value || typeof value !== 'string' || !value.trim()) {
        return 'Physical on-reservation street address is required.'
      }
      const trimmed = value.trim()
      if (trimmed.length < 5) return 'Physical street address must be at least 5 characters.'
      if (trimmed.length > 120) return 'Physical address cannot exceed 120 characters.'
      return null
    }

    case 'deliveryAddress.city': {
      if (!value || typeof value !== 'string' || !value.trim()) {
        return 'City or reservation community is required.'
      }
      const trimmed = value.trim()
      if (trimmed.length < 2) return 'City must be at least 2 characters.'
      if (trimmed.length > 60) return 'City cannot exceed 60 characters.'
      return null
    }

    case 'deliveryAddress.state': {
      if (!value || typeof value !== 'string' || value.trim().length !== 2) {
        return 'State must be a 2-letter postal code.'
      }
      return null
    }

    case 'deliveryAddress.zip': {
      if (!value || typeof value !== 'string' || !value.trim()) {
        return 'ZIP Code is required.'
      }
      const trimmed = value.trim()
      if (!/^\d{5}(-\d{4})?$/.test(trimmed)) {
        return 'ZIP Code must be a valid 5-digit (or 5+4) postal code.'
      }
      const zipDigits = trimmed.split('-')[0]
      const zipNum = parseInt(zipDigits, 10)
      const stateConfig = STATE_ZIP_RANGES[state]
      if (stateConfig) {
        const isPrefixMatch = stateConfig.prefixRegex.test(zipDigits)
        const isRangeMatch = zipNum >= stateConfig.min && zipNum <= stateConfig.max
        if (!isPrefixMatch || !isRangeMatch) {
          const formDesc = stateConfig.formCode ? ` (${stateConfig.formCode})` : ''
          return `Delivery state is ${stateConfig.name}${formDesc}, but ZIP code ${trimmed} is not located in ${stateConfig.name}.`
        }
      }
      return null
    }

    case 'carrierDeliveryMethod': {
      if (!value || !['COMMON_CARRIER', 'SELLER_DELIVERY', 'FOB_RESERVATION'].includes(value as string)) {
        return 'Please select a valid carrier delivery method (Common Carrier, Seller Fleet, or F.O.B.).'
      }
      return null
    }

    case 'deliveryConfirmationRef': {
      const trimmed = typeof value === 'string' ? value.trim() : ''
      if (trimmed) {
        if (/[<>;*%"'#&()=!]/.test(trimmed)) {
          return 'Delivery tracking reference contains invalid or prohibited characters.'
        }
        if (trimmed.length < 3 || trimmed.length > 60) {
          return 'Delivery tracking reference must be between 3 and 60 characters.'
        }
      }
      return null
    }

    case 'signatureBase64': {
      if (!value || typeof value !== 'string' || value.trim().length < 20) {
        return 'A digital declaration signature is required.'
      }
      if (!/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) {
        return 'Digital signature must be a valid drawn signature image.'
      }
      return null
    }

    case 'statutoryAffirmation': {
      if (value !== true) {
        return 'You must certify the statutory legal declaration under penalty of perjury.'
      }
      return null
    }

    default:
      return null
  }
}
