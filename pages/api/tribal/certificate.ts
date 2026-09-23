import type { NextApiRequest, NextApiResponse } from 'next'
import {
  generateSignedCertificate,
  getCertificateStatutoryNotice,
  getRequiredCertificateType,
  buildCertificatePdf,
} from '../../../lib/tribal/certificates.ts'
import { validateExemptionCertificate } from '../../../lib/tribal/validation.ts'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const {
      state,
      format,
      download,
      certificateId,
      customerName,
      tribalNation,
      enrollmentId,
      deliveryAddress,
      carrierDeliveryMethod,
      signatureHash,
      signedAt,
      expiresAt,
    } = req.query

    const targetState = (state as string) || 'US'
    const formType = getRequiredCertificateType(targetState)
    const statutoryNotice = getCertificateStatutoryNotice(formType)

    // PDF generation & download mode
    if (format === 'pdf' || download === 'pdf') {
      try {
        const certId = (certificateId as string) || `CERT-${formType}-${Date.now().toString(36).toUpperCase()}`
        const memberName = (customerName as string) || 'Verified Tribal Member'
        const nation = (tribalNation as string) || 'Federally Recognized Tribal Nation'
        const rawId = (enrollmentId as string) || '••••Verified'
        const maskedId = rawId.length > 4 && !rawId.startsWith('••') ? `••••${rawId.slice(-4)}` : rawId
        const address = (deliveryAddress as string) || `On-Reservation Delivery Address, ${targetState}`
        const carrier = (carrierDeliveryMethod as string) || 'COMMON_CARRIER'
        const sigHash = (signatureHash as string) || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        const signDate = (signedAt as string) || new Date().toISOString()
        const expDate =
          (expiresAt as string) ||
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

        const pdfBytes = buildCertificatePdf({
          certificateId: certId,
          formType,
          customerName: memberName,
          tribalNation: nation,
          enrollmentIdMasked: maskedId,
          deliveryAddress: address,
          carrierDeliveryMethod: carrier,
          state: targetState.toUpperCase(),
          signatureHash: sigHash,
          signedAt: signDate,
          expiresAt: expDate,
          entityUseCode: 'C',
        })

        const filename = `${formType}-${certId}.pdf`

        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.setHeader('Content-Length', pdfBytes.length.toString())
        res.setHeader('Cache-Control', 'no-store, max-age=0')
        return res.status(200).end(pdfBytes)
      } catch (err: any) {
        console.error('Error generating certificate PDF:', err)
        return res.status(500).json({ error: 'Failed to generate PDF certificate', details: err.message })
      }
    }

    return res.status(200).json({
      formType,
      statutoryNotice,
      state: targetState,
    })
  }

  if (req.method === 'POST') {
    try {
      const body = req.body

      // Strict Zod schema validation
      const validation = validateExemptionCertificate(body)
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed for exemption certificate.',
          errors: validation.errors,
        })
      }

      const validated = validation.data || body
      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1'

      const certRecord = generateSignedCertificate({
        customerId: validated.customerId || 'guest',
        customerName: validated.customerName,
        customerEmail: validated.customerEmail || '',
        tribalNation: validated.tribalNation,
        enrollmentId: validated.enrollmentId,
        reservationName: validated.reservationName || validated.tribalNation,
        deliveryAddress: validated.deliveryAddress,
        carrierDeliveryMethod: validated.carrierDeliveryMethod || 'COMMON_CARRIER',
        deliveryConfirmationRef: validated.deliveryConfirmationRef,
        signatureBase64: validated.signatureBase64,
        signedDate: validated.signedDate || new Date().toISOString(),
        ipAddress: clientIp,
        userAgent: req.headers['user-agent'],
      })

      // If format=pdf requested on POST, return downloadable PDF directly
      if (req.query.format === 'pdf' || body.format === 'pdf') {
        const pdfBytes = buildCertificatePdf({
          certificateId: certRecord.id,
          formType: certRecord.formType,
          customerName: body.customerName,
          customerEmail: body.customerEmail,
          tribalNation: certRecord.tribalNation,
          enrollmentIdMasked: certRecord.enrollmentIdMasked,
          deliveryAddress: certRecord.deliveryAddress,
          carrierDeliveryMethod: certRecord.carrierDeliveryMethod,
          state: certRecord.state,
          signatureHash: certRecord.signatureHash,
          signedAt: certRecord.signedAt,
          expiresAt: certRecord.expiresAt,
          entityUseCode: 'C',
        })

        const filename = `${certRecord.formType}-${certRecord.id}.pdf`
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.setHeader('Content-Length', pdfBytes.length.toString())
        res.setHeader('Cache-Control', 'no-store, max-age=0')
        return res.status(200).end(pdfBytes)
      }

      const pdfDownloadUrl = `/api/tribal/certificate?format=pdf&certificateId=${encodeURIComponent(certRecord.id)}&state=${encodeURIComponent(certRecord.state)}&customerName=${encodeURIComponent(body.customerName)}&tribalNation=${encodeURIComponent(certRecord.tribalNation)}&enrollmentId=${encodeURIComponent(certRecord.enrollmentIdMasked)}&deliveryAddress=${encodeURIComponent(certRecord.deliveryAddress)}&carrierDeliveryMethod=${encodeURIComponent(certRecord.carrierDeliveryMethod)}&signatureHash=${encodeURIComponent(certRecord.signatureHash)}`

      return res.status(200).json({
        success: true,
        certificate: certRecord,
        pdfDownloadUrl,
      })
    } catch (err: any) {
      console.error('Error generating certificate:', err)
      return res.status(500).json({ error: 'Failed to generate signed certificate', details: err.message })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Method Not Allowed' })
}

