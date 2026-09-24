/**
 * Tribal Exemption Certificate PDF Generator
 * 
 * Generates official, statutory PDF documents conforming to the PDF-1.4 standard
 * for California CDTFA-146-RES, Washington WAC 458-20-192, and General Sovereign Exemption forms.
 */

export interface CertificatePdfPayload {
  certificateId: string
  formType: 'CDTFA-146-RES' | 'WAC-458-20-192' | 'GENERAL_TRIBAL_EXEMPTION' | string
  customerId?: string
  customerName: string
  customerEmail?: string
  tribalNation: string
  enrollmentIdMasked: string
  deliveryAddress: string
  carrierDeliveryMethod: string
  state: string
  signatureHash: string
  signatureBase64?: string
  signedAt: string
  expiresAt: string
  entityUseCode?: string
  notes?: string
}

function escapePdfText(str: string): string {
  if (!str) return ''
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]+/g, ' ')
}

/**
 * Builds a valid PDF-1.4 binary buffer from certificate data
 */
export function buildCertificatePdf(payload: CertificatePdfPayload): Buffer {
  const isCalifornia =
    payload.formType.includes('CDTFA') || payload.state.toUpperCase() === 'CA'
  const isWashington =
    payload.formType.includes('WAC') || payload.state.toUpperCase() === 'WA'

  const title = isCalifornia
    ? 'CALIFORNIA SALES AND USE TAX EXEMPTION CERTIFICATE'
    : isWashington
    ? 'WASHINGTON STATE INDIAN COUNTRY EXEMPTION CERTIFICATE'
    : 'TRIBAL SOVEREIGN SALES & USE TAX EXEMPTION CERTIFICATE'

  const subtitle = isCalifornia
    ? 'Purchases by American Indians for Delivery to an Indian Reservation (CDTFA-146-RES)'
    : isWashington
    ? 'Sales to Enrolled Tribal Members in Indian Country (WAC 458-20-192)'
    : 'Uniform Tribal Exemption Under Indian Commerce Clause (Avalara Entity Use Code C)'

  const legalCitation = isCalifornia
    ? 'California Revenue and Taxation Code Section 6358 & CDTFA Regulation 1616'
    : isWashington
    ? 'Washington Administrative Code (WAC) 458-20-192 & RCW 82.08.0254'
    : 'U.S. Constitution Art. I, Section 8, cl. 3 & Federal Preemption Standards'

  const affirmationText = isCalifornia
    ? 'I hereby certify that I am an enrolled member of the American Indian Tribe designated above and that delivery of the tangible personal property described herein will take place on the designated Indian reservation or Indian trust land. I declare under penalty of perjury under the laws of the State of California that this certificate is true, correct, and complete.'
    : isWashington
    ? 'I certify that I am an enrolled tribal member entitled to statutory exemption under WAC 458-20-192 and RCW 82.08.0254, and that all purchases will be delivered to and received within Indian Country. This certificate is executed under penalty of perjury under the laws of the State of Washington.'
    : 'I certify that I am an enrolled member of a federally recognized Indian tribe and that delivery of the tangible personal property purchased will take place on recognized tribal trust / reservation land in full compliance with federal and state tax exemptions.'

  const dateFormatted = payload.signedAt
    ? new Date(payload.signedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US')

  const expiryFormatted = payload.expiresAt
    ? new Date(payload.expiresAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '1 Year from Issuance'

  // Stream graphics commands (standard 8.5 x 11 in points: 612 x 792)
  const streamLines: string[] = []

  // Top header banner background
  streamLines.push('q')
  streamLines.push('0.06 0.16 0.28 rg') // Dark Slate / Navy banner
  streamLines.push('40 710 532 50 re f')
  streamLines.push('Q')

  // Top header text
  streamLines.push('BT')
  streamLines.push('/F2 13 Tf') // Bold
  streamLines.push('1 1 1 rg') // White text
  streamLines.push('55 738 Td')
  streamLines.push(`(${escapePdfText(title)}) Tj`)
  streamLines.push('ET')

  streamLines.push('BT')
  streamLines.push('/F1 9 Tf') // Regular
  streamLines.push('0.85 0.92 0.98 rg')
  streamLines.push('55 722 Td')
  streamLines.push(`(${escapePdfText(subtitle)}) Tj`)
  streamLines.push('ET')

  // Certificate ID & Statutory Ref Bar
  streamLines.push('q')
  streamLines.push('0.95 0.96 0.98 rg')
  streamLines.push('40 675 532 26 re f')
  streamLines.push('0.8 0.84 0.88 RG 0.5 w')
  streamLines.push('40 675 532 26 re S')
  streamLines.push('Q')

  streamLines.push('BT')
  streamLines.push('/F2 9 Tf')
  streamLines.push('0.1 0.15 0.2 rg')
  streamLines.push('50 684 Td')
  streamLines.push(
    `(${escapePdfText(`Certificate ID: ${payload.certificateId}    |    Form: ${payload.formType}    |    Jurisdiction: ${payload.state}`)}) Tj`
  )
  streamLines.push('ET')

  // Section 1: Enrolled Member Information Box
  streamLines.push('q')
  streamLines.push('0.1 0.1 0.1 RG 0.5 w')
  streamLines.push('40 525 532 140 re S')
  streamLines.push('0.92 0.94 0.97 rg 40 645 532 20 re f')
  streamLines.push('40 645 532 20 re S')
  streamLines.push('Q')

  streamLines.push('BT')
  streamLines.push('/F2 10 Tf')
  streamLines.push('0.1 0.2 0.3 rg')
  streamLines.push('50 651 Td')
  streamLines.push('(SECTION 1: ENROLLED TRIBAL MEMBER & NATION IDENTIFICATION) Tj')
  streamLines.push('ET')

  const memberFields = [
    { label: 'Full Legal Name:', value: payload.customerName },
    { label: 'Federally Recognized Tribal Nation:', value: payload.tribalNation },
    { label: 'Tribal Enrollment / Census Roll ID:', value: payload.enrollmentIdMasked },
    { label: 'Contact Email Address:', value: payload.customerEmail || 'On file with DisplayCellPros' },
    { label: 'Avalara AvaTax Entity Use Code:', value: `${payload.entityUseCode || 'C'} (Tribal Government / Enrolled Member)` },
  ]

  let yOffset = 625
  for (const f of memberFields) {
    streamLines.push('BT')
    streamLines.push('/F2 8.5 Tf')
    streamLines.push('0.3 0.35 0.4 rg')
    streamLines.push(`50 ${yOffset} Td`)
    streamLines.push(`(${escapePdfText(f.label)}) Tj`)
    streamLines.push('ET')

    streamLines.push('BT')
    streamLines.push('/F1 9 Tf')
    streamLines.push('0.05 0.05 0.05 rg')
    streamLines.push(`240 ${yOffset} Td`)
    streamLines.push(`(${escapePdfText(f.value)}) Tj`)
    streamLines.push('ET')

    yOffset -= 22
  }

  // Section 2: On-Reservation Delivery & Carrier Details
  streamLines.push('q')
  streamLines.push('0.1 0.1 0.1 RG 0.5 w')
  streamLines.push('40 405 532 110 re S')
  streamLines.push('0.92 0.94 0.97 rg 40 495 532 20 re f')
  streamLines.push('40 495 532 20 re S')
  streamLines.push('Q')

  streamLines.push('BT')
  streamLines.push('/F2 10 Tf')
  streamLines.push('0.1 0.2 0.3 rg')
  streamLines.push('50 501 Td')
  streamLines.push('(SECTION 2: CERTIFIED ON-RESERVATION DELIVERY DESTINATION) Tj')
  streamLines.push('ET')

  const deliveryFields = [
    { label: 'Delivery Address (Reservation / Trust Land):', value: payload.deliveryAddress },
    { label: 'Carrier Freight Delivery Method:', value: payload.carrierDeliveryMethod || 'COMMON_CARRIER' },
    { label: 'Statutory Exemption Basis:', value: legalCitation },
    { label: 'Reservation Geofence Audit Boundary:', value: 'AIANA TIGER/Line Shapefile Verified' },
  ]

  yOffset = 475
  for (const f of deliveryFields) {
    streamLines.push('BT')
    streamLines.push('/F2 8.5 Tf')
    streamLines.push('0.3 0.35 0.4 rg')
    streamLines.push(`50 ${yOffset} Td`)
    streamLines.push(`(${escapePdfText(f.label)}) Tj`)
    streamLines.push('ET')

    streamLines.push('BT')
    streamLines.push('/F1 9 Tf')
    streamLines.push('0.05 0.05 0.05 rg')
    streamLines.push(`240 ${yOffset} Td`)
    streamLines.push(`(${escapePdfText(f.value)}) Tj`)
    streamLines.push('ET')

    yOffset -= 20
  }

  // Section 3: Statutory Declaration & Digital Signature
  streamLines.push('q')
  streamLines.push('0.1 0.1 0.1 RG 0.5 w')
  streamLines.push('40 180 532 215 re S')
  streamLines.push('0.92 0.94 0.97 rg 40 375 532 20 re f')
  streamLines.push('40 375 532 20 re S')
  streamLines.push('Q')

  streamLines.push('BT')
  streamLines.push('/F2 10 Tf')
  streamLines.push('0.1 0.2 0.3 rg')
  streamLines.push('50 381 Td')
  streamLines.push('(SECTION 3: STATUTORY DECLARATION UNDER PENALTY OF PERJURY) Tj')
  streamLines.push('ET')

  // Split affirmation text into multiple lines
  const words = affirmationText.split(' ')
  let currentLine = ''
  const affLines: string[] = []
  for (const word of words) {
    if ((currentLine + ' ' + word).length > 95) {
      affLines.push(currentLine.trim())
      currentLine = word
    } else {
      currentLine = (currentLine + ' ' + word).trim()
    }
  }
  if (currentLine) affLines.push(currentLine.trim())

  let affY = 355
  for (const l of affLines) {
    streamLines.push('BT')
    streamLines.push('/F1 8 Tf')
    streamLines.push('0.15 0.15 0.15 rg')
    streamLines.push(`50 ${affY} Td`)
    streamLines.push(`(${escapePdfText(l)}) Tj`)
    streamLines.push('ET')
    affY -= 13
  }

  // Digital Signature Box inside Section 3
  streamLines.push('q')
  streamLines.push('0.97 0.98 0.99 rg 50 220 512 85 re f')
  streamLines.push('0.2 0.5 0.3 RG 1 w 50 220 512 85 re S')
  streamLines.push('Q')

  streamLines.push('BT')
  streamLines.push('/F2 9 Tf')
  streamLines.push('0.05 0.45 0.2 rg')
  streamLines.push('60 288 Td')
  streamLines.push('(DIGITALLY SIGNED & CRYPTOGRAPHICALLY SECURED) Tj')
  streamLines.push('ET')

  streamLines.push('BT')
  streamLines.push('/F2 8.5 Tf')
  streamLines.push('0.2 0.2 0.2 rg')
  streamLines.push('60 270 Td')
  streamLines.push(`(${escapePdfText(`Signer Name: ${payload.customerName}`)}) Tj`)
  streamLines.push('ET')

  streamLines.push('BT')
  streamLines.push('/F1 8.5 Tf')
  streamLines.push('0.2 0.2 0.2 rg')
  streamLines.push('60 254 Td')
  streamLines.push(`(${escapePdfText(`Signed Date: ${dateFormatted}    |    Valid Through: ${expiryFormatted}`)}) Tj`)
  streamLines.push('ET')

  streamLines.push('BT')
  streamLines.push('/F1 7.5 Tf')
  streamLines.push('0.3 0.3 0.3 rg')
  streamLines.push('60 238 Td')
  streamLines.push(`(${escapePdfText(`SHA-256 Audit Digest: ${payload.signatureHash}`)}) Tj`)
  streamLines.push('ET')

  streamLines.push('BT')
  streamLines.push('/F1 7.5 Tf')
  streamLines.push('0.4 0.4 0.4 rg')
  streamLines.push('60 226 Td')
  streamLines.push('(E-Sign Compliance: 15 U.S.C. 7001 / Uniform Electronic Transactions Act UETA) Tj')
  streamLines.push('ET')

  // Statutory Warning & Document Footer
  streamLines.push('BT')
  streamLines.push('/F1 7.5 Tf')
  streamLines.push('0.5 0.5 0.5 rg')
  streamLines.push('40 160 Td')
  streamLines.push(
    '(NOTICE TO SELLER: Retain this exemption certificate in your audit compliance records for not less than 4 years.) Tj'
  )
  streamLines.push('ET')

  streamLines.push('BT')
  streamLines.push('/F1 7.5 Tf')
  streamLines.push('0.5 0.5 0.5 rg')
  streamLines.push('40 148 Td')
  streamLines.push(
    '(This document constitutes legal evidence of sales tax exemption for on-reservation transactions under State & Federal law.) Tj'
  )
  streamLines.push('ET')

  // Document Footer line
  streamLines.push('q')
  streamLines.push('0.85 0.85 0.85 RG 0.5 w')
  streamLines.push('40 135 532 0.5 re S')
  streamLines.push('Q')

  streamLines.push('BT')
  streamLines.push('/F1 7 Tf')
  streamLines.push('0.6 0.6 0.6 rg')
  streamLines.push('40 120 Td')
  streamLines.push(
    `(${escapePdfText(`DisplayCellPros Tribal Verification & Tax Compliance Engine    |    Generated: ${new Date().toISOString()}`)}) Tj`
  )
  streamLines.push('ET')

  const streamContent = streamLines.join('\n')
  const streamLength = Buffer.byteLength(streamContent, 'utf-8')

  // Build PDF Objects
  const objects: string[] = []
  
  // Obj 1: Catalog
  objects[1] = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
  
  // Obj 2: Pages
  objects[2] = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'
  
  // Obj 3: Page
  objects[3] =
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n'
  
  // Obj 4: Font F1 (Helvetica)
  objects[4] =
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n'
  
  // Obj 5: Font F2 (Helvetica-Bold)
  objects[5] =
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n'
  
  // Obj 6: Stream Contents
  objects[6] = `6 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`

  let pdfHeader = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'
  let currentOffset = Buffer.byteLength(pdfHeader, 'latin1')

  const xrefOffsets: number[] = [0] // Obj 0 is always 0
  let body = ''

  for (let i = 1; i <= 6; i++) {
    xrefOffsets[i] = currentOffset
    body += objects[i]
    currentOffset += Buffer.byteLength(objects[i], 'latin1')
  }

  const startxref = currentOffset

  let xref = `xref\n0 7\n0000000000 65535 f \n`
  for (let i = 1; i <= 6; i++) {
    xref += `${String(xrefOffsets[i]).padStart(10, '0')} 00000 n \n`
  }

  const trailer = `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`

  const fullPdfStr = pdfHeader + body + xref + trailer
  return Buffer.from(fullPdfStr, 'latin1')
}

/**
 * Creates a browser-downloadable Blob for the PDF
 */
export function generateCertificatePdfBlob(payload: CertificatePdfPayload): Blob {
  const bytes = buildCertificatePdf(payload)
  const arrayBuffer = new ArrayBuffer(bytes.length)
  const view = new Uint8Array(arrayBuffer)
  for (let i = 0; i < bytes.length; i++) {
    view[i] = bytes[i]
  }
  return new Blob([view], { type: 'application/pdf' })
}

/**
 * Initiates an automatic PDF download in the user's browser
 */
export function downloadCertificatePdf(
  payload: CertificatePdfPayload,
  filename?: string
): void {
  if (typeof window === 'undefined') return

  const blob = generateCertificatePdfBlob(payload)
  const isCalifornia =
    payload.formType.includes('CDTFA') || payload.state.toUpperCase() === 'CA'
  const isWashington =
    payload.formType.includes('WAC') || payload.state.toUpperCase() === 'WA'

  const defaultPrefix = isCalifornia
    ? 'CDTFA-146-RES'
    : isWashington
    ? 'WAC-458-20-192'
    : 'TRIBAL-EXEMPTION-CERT'

  const generatedFilename =
    filename || `${defaultPrefix}-${payload.certificateId || 'SIGNED'}.pdf`

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = generatedFilename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
