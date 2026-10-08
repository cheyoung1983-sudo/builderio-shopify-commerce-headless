/**
 * Verified public business details for Display & Cell Pros.
 *
 * Only add a field here once it has been confirmed. Every value below is
 * published as structured data (LocalBusiness JSON-LD) and shown to
 * customers, so a guessed phone number, address or set of hours is worse
 * than leaving it out.
 *
 * Sources (checked Oct 2026):
 * - legalName / city / state: WA business license for "Display & Cell Pros
 *   LLC", Spokane, WA (Spokane Journal of Business license listing, July 2026).
 * - email: the support address already published in the site footer.
 * - Mobile, service-area business with no public storefront, so no street
 *   address is published.
 *
 * Not yet verified, so intentionally omitted: telephone, street address,
 * opening hours.
 */
export const BUSINESS_INFO = {
  name: 'Display & Cell Pros',
  legalName: 'Display & Cell Pros LLC',
  url: 'https://www.displaycellpros.com',
  logo: 'https://www.displaycellpros.com/assets/logo-new.png',
  email: 'support@displaycellpros.com',
  addressLocality: 'Spokane',
  addressRegion: 'WA',
  addressCountry: 'US',
  areaServed: 'Spokane, WA',
} as const

export function buildLocalBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ElectronicsRepairShop',
    '@id': `${BUSINESS_INFO.url}/#business`,
    name: BUSINESS_INFO.name,
    legalName: BUSINESS_INFO.legalName,
    url: BUSINESS_INFO.url,
    logo: BUSINESS_INFO.logo,
    image: BUSINESS_INFO.logo,
    email: BUSINESS_INFO.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: BUSINESS_INFO.addressLocality,
      addressRegion: BUSINESS_INFO.addressRegion,
      addressCountry: BUSINESS_INFO.addressCountry,
    },
    areaServed: {
      '@type': 'City',
      name: BUSINESS_INFO.areaServed,
    },
  }
}
