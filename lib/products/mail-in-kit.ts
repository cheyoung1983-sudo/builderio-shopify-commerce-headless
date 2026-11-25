/**
 * Identifiers and copy helpers for the Mail-In Diagnostic Kit product page.
 * The kit is a shipping-and-diagnosis service, not an on-site install, so the
 * generic ProductDetail "professional installation / 45–60 minutes" template
 * must not be used for it.
 */

export const MAIL_IN_DIAGNOSTIC_KIT_HANDLE = 'mail-in-diagnostic-kit'
export const MAIL_IN_DIAGNOSTIC_KIT_SKU = 'SVC-MAILIN-DIAG'

/**
 * Local gallery image used only when Shopify has no product photo. Flow should
 * still add a real kit photo in Shopify so this is a temporary fallback.
 */
export const MAIL_IN_KIT_FALLBACK_IMAGE = '/assets/logo-new.png'

export const MAIL_IN_KIT_TURNAROUND_NOTICE =
  'Typical bench turnaround is 24–48 hours after we receive your device. The $40 diagnostic fee is credited toward an approved repair. If you cancel before your kit ships, you get a full refund. Once your kit ships, we keep the full $40. We pay return shipping.'

type VariantEdge = {
  node?: { sku?: string | null } | null
}

export function isMailInDiagnosticKit(
  product:
    | {
        handle?: string | null
        variants?: { edges?: Array<VariantEdge> | null } | null
      }
    | null
    | undefined
): boolean {
  if (!product) return false
  if (product.handle === MAIL_IN_DIAGNOSTIC_KIT_HANDLE) return true
  const edges = product.variants?.edges
  if (!Array.isArray(edges)) return false
  return edges.some((edge) => edge?.node?.sku === MAIL_IN_DIAGNOSTIC_KIT_SKU)
}
