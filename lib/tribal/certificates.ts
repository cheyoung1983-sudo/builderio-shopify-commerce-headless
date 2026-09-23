import crypto from 'node:crypto'
import type { SignedCertificateRecord } from './types.ts'

export interface CertificateGenerationPayload {
  customerId: string
  customerName: string
  customerEmail: string
  tribalNation: string
  enrollmentId: string
  reservationName: string
  deliveryAddress: {
    address1: string
    city: string
    state: string
    zip: string
  }
  carrierDeliveryMethod: 'COMMON_CARRIER' | 'SELLER_DELIVERY' | 'FOB_RESERVATION'
  deliveryConfirmationRef?: string
  signatureBase64: string
  signedDate?: string
  ipAddress?: string
  userAgent?: string
}

export function getRequiredCertificateType(state: string): 'CDTFA-146-RES' | 'WAC-458-20-192' | 'GENERAL_TRIBAL_EXEMPTION' {
  const normState = (state || '').toUpperCase().trim()
  if (normState === 'CA' || normState === 'CALIFORNIA') {
    return 'CDTFA-146-RES'
  }
  if (normState === 'WA' || normState === 'WASHINGTON') {
    return 'WAC-458-20-192'
  }
  return 'GENERAL_TRIBAL_EXEMPTION'
}

export function generateSignedCertificate(payload: CertificateGenerationPayload): SignedCertificateRecord {
  const formType = getRequiredCertificateType(payload.deliveryAddress.state)
  const signedAt = payload.signedDate || new Date().toISOString()
  
  const expiryDate = new Date(new Date(signedAt).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()

  const rawId = payload.enrollmentId || ''
  const maskedId = rawId.length > 4 ? `••••${rawId.slice(-4)}` : rawId

  const certAuditContent = JSON.stringify({
    formType,
    customerId: payload.customerId,
    customerName: payload.customerName,
    tribalNation: payload.tribalNation,
    maskedId,
    deliveryAddress: payload.deliveryAddress,
    carrierDeliveryMethod: payload.carrierDeliveryMethod,
    signedAt,
    signatureDigest: crypto.createHash('sha256').update(payload.signatureBase64).digest('hex'),
  })

  const signatureHash = crypto.createHash('sha256').update(certAuditContent).digest('hex')
  const certId = `CERT-${formType}-${signatureHash.substring(0, 12).toUpperCase()}`

  return {
    id: certId,
    customerId: payload.customerId,
    formType,
    state: payload.deliveryAddress.state.toUpperCase(),
    tribalNation: payload.tribalNation,
    enrollmentIdMasked: maskedId,
    deliveryAddress: `${payload.deliveryAddress.address1}, ${payload.deliveryAddress.city}, ${payload.deliveryAddress.state} ${payload.deliveryAddress.zip}`,
    carrierDeliveryMethod: payload.carrierDeliveryMethod,
    signatureHash,
    signedAt,
    expiresAt: expiryDate,
    documentRef: `https://displaycellpros.com/documents/certificates/${certId}`,
  }
}

export function getCertificateStatutoryNotice(formType: string): string {
  switch (formType) {
    case 'CDTFA-146-RES':
      return 'California Sales and Use Tax Exemption Certificate (CDTFA-146-RES): I hereby certify that I am an enrolled member of the designated Indian Tribe and that delivery of the tangible personal property described herein will take place on the Indian Reservation / trust land in accordance with California Revenue and Taxation Code Section 6358.'
    case 'WAC-458-20-192':
      return 'Washington State Department of Revenue Indian Country Exemption Certificate (WAC 458-20-192): I certify that I am an enrolled tribal member and that goods purchased will be delivered to Indian Country for use by an enrolled tribal member / tribal enterprise.'
    default:
      return 'Federal Indian Commerce Clause & Tribal Sovereign Exemption Declaration: I certify that I am an enrolled member of a federally recognized Indian tribe and that the purchased tangible personal property is delivered to recognized tribal trust / reservation land.'
  }
}

export {
  buildCertificatePdf,
  generateCertificatePdfBlob,
  downloadCertificatePdf,
} from './pdf-generator.ts'
export type { CertificatePdfPayload } from './pdf-generator.ts'
