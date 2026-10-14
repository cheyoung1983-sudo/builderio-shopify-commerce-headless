/**
 * Shopify Admin GraphQL Mutation & Customer Metafield Synchronization
 * Updates customer tags, tax exemption status, and audit metafields.
 *
 * Uses the shared Admin client (client-credentials token). Requires the
 * write_customers scope. Returns success:false when Admin isn't configured;
 * it never reports a simulated success.
 */

import { isShopifyAdminConfigured, shopifyAdminFetch } from '../../services/shopify-admin.ts'

export interface ShopifyCustomerUpdateInput {
  id: string
  tags?: string[]
  taxExempt?: boolean
  taxExemptions?: string[]
  metafields?: Array<{
    namespace: string
    key: string
    value: string
    type: string
  }>
}

export const CUSTOMER_UPDATE_MUTATION = `
mutation customerUpdate($input: CustomerInput!) {
  customerUpdate(input: $input) {
    customer {
      id
      taxExempt
      taxExemptions
      tags
      metafields(first: 10) {
        edges {
          node {
            namespace
            key
            value
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`

/**
 * Updates a Shopify Customer with Tribal Member Verification status,
 * automatic discount tags, tax exemptions, and audit metafields.
 */
export async function updateShopifyCustomerTribalStatus(params: {
  customerId: string
  tagsToAdd?: string[]
  taxExempt?: boolean
  taxExemptions?: string[]
  audit: {
    verificationHash: string
    verifiedAt: string
    tribalNation: string
    maskedEnrollmentId: string
    certificateRef?: string
  }
}) {
  const { customerId, tagsToAdd = ['tribal-member-verified'], taxExempt = false, taxExemptions = [], audit } = params

  const formattedId = customerId.startsWith('gid://shopify/Customer/')
    ? customerId
    : `gid://shopify/Customer/${customerId}`

  const metafields = [
    {
      namespace: 'custom',
      key: 'tribal_verification_hash',
      value: audit.verificationHash,
      type: 'single_line_text_field',
    },
    {
      namespace: 'custom',
      key: 'tribal_verified_at',
      value: audit.verifiedAt,
      type: 'date_time',
    },
    {
      namespace: 'custom',
      key: 'tribal_nation',
      value: audit.tribalNation,
      type: 'single_line_text_field',
    },
    {
      namespace: 'custom',
      key: 'tribal_enrollment_id_masked',
      value: audit.maskedEnrollmentId,
      type: 'single_line_text_field',
    },
  ]

  if (audit.certificateRef) {
    metafields.push({
      namespace: 'custom',
      key: 'tribal_exemption_cert_ref',
      value: audit.certificateRef,
      type: 'single_line_text_field',
    })
  }

  const input: ShopifyCustomerUpdateInput = {
    id: formattedId,
    tags: tagsToAdd,
    taxExempt,
    taxExemptions: taxExempt ? (taxExemptions.length > 0 ? taxExemptions : ['EXEMPT_INDIAN_IN_CANADA_OR_USA']) : [],
    metafields,
  }

  if (!isShopifyAdminConfigured()) {
    // No simulated success: without Admin access nothing was written to Shopify.
    return {
      success: false,
      notConfigured: true,
      data: null,
      userErrors: [{ field: null, message: 'Shopify Admin API is not configured; customer was not updated.' }],
    }
  }

  const result = await shopifyAdminFetch<{
    customerUpdate?: { customer?: any; userErrors?: Array<{ field: string[] | null; message: string }> }
  }>({
    query: CUSTOMER_UPDATE_MUTATION,
    variables: { input },
  })

  const userErrors = result.data?.customerUpdate?.userErrors || []
  const customer = result.data?.customerUpdate?.customer

  if (customer && userErrors.length === 0 && !result.errors?.length) {
    return { success: true, data: customer, userErrors: [] }
  }

  return {
    success: false,
    data: customer || null,
    userErrors: userErrors.length
      ? userErrors
      : (result.errors || [{ message: 'Shopify customerUpdate failed.' }]).map((e) => ({
          field: null,
          message: e.message,
        })),
  }
}
