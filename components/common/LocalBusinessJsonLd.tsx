import React from 'react'
import { buildLocalBusinessJsonLd } from '@lib/business-info'

/**
 * Site-wide LocalBusiness (ElectronicsRepairShop) structured data.
 * Rendered from the footer so it appears on every page. Only verified
 * fields from lib/business-info.ts are included.
 */
export const LocalBusinessJsonLd: React.FC = () => {
  const jsonLd = buildLocalBusinessJsonLd()
  return (
    <script
      type="application/ld+json"
      id="local-business-jsonld"
      // Escape "<" to prevent script injection (standard JSON-LD mitigation)
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  )
}

export default LocalBusinessJsonLd
