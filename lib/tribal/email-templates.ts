/**
 * Tribal Verification & Exemption Notice Email Templates
 * Responsive HTML & Plaintext templates for Resend / SendGrid dispatch.
 */

export interface TribalVerificationEmailData {
  customerName?: string
  customerEmail: string
  tribalNation: string
  maskedEnrollmentId: string
  verificationHash: string
  verifiedAt: string
  discountPercentage?: number // default 20%
  discountCode?: string // e.g. 'TRIBAL-MEMBER-20'
  isTaxExempt?: boolean
  certificateRef?: string
  storeName?: string
  storeUrl?: string
  accountUrl?: string
}

/**
 * Generates the clean plaintext version of the notification
 */
export function generateTribalVerificationTextEmail(data: TribalVerificationEmailData): string {
  const storeName = data.storeName || 'Display & Cell Pros'
  const discountPct = data.discountPercentage || 20
  const storeUrl = data.storeUrl || 'https://displaycellpros.com'
  const accountUrl = data.accountUrl || `${storeUrl}/account`

  return `
${storeName} - Tribal Member Verification Confirmed

Hello ${data.customerName || 'Valued Customer'},

Congratulations! Your tribal enrollment verification with the ${data.tribalNation} has been successfully approved and recorded in our systems.

YOUR VERIFIED BENEFITS
--------------------------------------------------
1. 20% Commercial Member Discount
   - Automatic 20% discount on all qualified screens, parts, and accessories.
   - Code: ${data.discountCode || 'TRIBAL-MEMBER-20'} (applied automatically when signed in).

2. On-Reservation Sales Tax Exemption
   - Status: ${data.isTaxExempt ? 'Active (Entity Use Code C)' : 'Eligible for On-Reservation Deliveries'}
   - Applicable to orders delivered to certified tribal reservation and trust lands.
   ${data.certificateRef ? `- State Exemption Certificate Reference: ${data.certificateRef}` : ''}

VERIFICATION AUDIT DETAILS
--------------------------------------------------
- Tribal Nation: ${data.tribalNation}
- Census Roll ID: ${data.maskedEnrollmentId}
- Verification Date: ${new Date(data.verifiedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
- Cryptographic Audit Hash (SHA-256): ${data.verificationHash}

You can manage your verification status, view signed exemption certificates, and browse catalog discounts anytime at:
${accountUrl}

Thank you for being part of the ${storeName} community.

Warm regards,
The ${storeName} Team
${storeUrl}
`.trim()
}

/**
 * Generates the responsive, email-client compliant HTML version
 */
export function generateTribalVerificationHtmlEmail(data: TribalVerificationEmailData): string {
  const storeName = data.storeName || 'Display & Cell Pros'
  const discountPct = data.discountPercentage || 20
  const storeUrl = data.storeUrl || 'https://displaycellpros.com'
  const accountUrl = data.accountUrl || `${storeUrl}/account`
  const formattedDate = new Date(data.verifiedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tribal Verification Confirmed - ${storeName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 15px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 32px 28px;
      text-align: center;
      color: #ffffff;
    }
    .badge {
      display: inline-block;
      background-color: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.3);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 12px;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .lead-text {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 24px;
    }
    .benefit-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 14px;
    }
    .benefit-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
    }
    .benefit-tag {
      background-color: #4f46e5;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: 8px;
    }
    .benefit-desc {
      font-size: 13px;
      color: #64748b;
      line-height: 1.5;
      margin: 0;
    }
    .audit-box {
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 16px;
      margin: 24px 0;
      font-size: 12px;
    }
    .audit-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      color: #475569;
    }
    .audit-label {
      font-weight: 600;
      color: #334155;
    }
    .audit-val {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #0f172a;
    }
    .hash-val {
      word-break: break-all;
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
    }
    .button-group {
      text-align: center;
      margin: 32px 0 16px;
    }
    .btn-primary {
      display: inline-block;
      background-color: #0f172a;
      color: #ffffff !important;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 28px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .footer a {
      color: #64748b;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <div class="badge">Verification Confirmed</div>
        <h1>Tribal Member Enrollment Approved</h1>
      </div>

      <!-- Main Content -->
      <div class="content">
        <div class="greeting">Hello ${data.customerName || 'Valued Member'},</div>
        <p class="lead-text">
          We are pleased to confirm that your tribal enrollment with <strong>${data.tribalNation}</strong> has been successfully verified. Your account is now activated with exclusive dual-track member benefits.
        </p>

        <!-- Track 1 Card -->
        <div class="benefit-card">
          <div class="benefit-title">
            Track 1: ${discountPct}% Commercial Discount
            <span class="benefit-tag">Active</span>
          </div>
          <p class="benefit-desc">
            Your <strong>${discountPct}% discount</strong> is automatically applied to all eligible screens and replacement parts upon signing in.
          </p>
        </div>

        <!-- Track 2 Card -->
        <div class="benefit-card">
          <div class="benefit-title">
            Track 2: On-Reservation Sales Tax Exemption
            <span class="benefit-tag" style="background-color: #059669;">Avalara Code C</span>
          </div>
          <p class="benefit-desc">
            Deliveries to certified reservation and trust lands automatically qualify for state and local sales tax exemptions under Avalara AvaTax Entity Use Code 'C'.
          </p>
        </div>

        <!-- Audit Record Box -->
        <div class="audit-box">
          <div class="audit-row">
            <span class="audit-label">Tribal Nation:</span>
            <span class="audit-val">${data.tribalNation}</span>
          </div>
          <div class="audit-row">
            <span class="audit-label">Enrollment ID:</span>
            <span class="audit-val">${data.maskedEnrollmentId}</span>
          </div>
          <div class="audit-row">
            <span class="audit-label">Verification Date:</span>
            <span class="audit-val">${formattedDate}</span>
          </div>
          ${
            data.certificateRef
              ? `<div class="audit-row">
                  <span class="audit-label">Exemption Certificate:</span>
                  <span class="audit-val">${data.certificateRef}</span>
                </div>`
              : ''
          }
          <div style="margin-top: 8px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
            <div class="audit-label" style="font-size: 11px;">Cryptographic Audit Digest (SHA-256):</div>
            <div class="audit-val hash-val">${data.verificationHash}</div>
          </div>
        </div>

        <!-- CTA Buttons -->
        <div class="button-group">
          <a href="${storeUrl}" class="btn-primary" target="_blank">
            Shop with Member Discount &rarr;
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>
          This notice is an official compliance confirmation for federal and state tax exemption records.<br>
          View your full verified status anytime in your <a href="${accountUrl}">Account Dashboard</a>.
        </p>
        <p style="margin-top: 10px;">
          &copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}
