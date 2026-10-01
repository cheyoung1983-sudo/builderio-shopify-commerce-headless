import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as logger from 'firebase-functions/logger'
import * as admin from 'firebase-admin'
import sgMail from '@sendgrid/mail'

if (!admin.apps.length) {
  admin.initializeApp()
}

const sendgridApiKey = process.env.SENDGRID_API_KEY || ''
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey)
}

/**
 * Trigger path: repair_requests/{requestId} or repair_requests/{rmsNumber}
 * Status mapping for repair notification emails:
 * - kit_requested: Free shipping kit dispatched
 * - inbound_transit: Device in transit to facility
 * - bench_triage: ISO Cleanroom bench triage
 * - qc_calibration: Post-repair QC calibration
 * - outbound_delivery: Dispatched back to customer
 */
export const sendRepairStatusEmail = onDocumentUpdated(
  'repair_requests/{requestId}',
  async (event) => {
    const snapshot = event.data
    if (!snapshot) {
      logger.info('No snapshot data found.')
      return
    }

    const beforeData = snapshot.before.data()
    const afterData = snapshot.after.data()

    if (!afterData) {
      logger.info('Document deleted or no updated data.')
      return
    }

    const oldStatus = beforeData?.status
    const newStatus = afterData.status

    if (oldStatus === newStatus) {
      logger.info(`Status unchanged for request ${event.params.requestId}: ${newStatus}`)
      return
    }

    const customerEmail = afterData.customerEmail || afterData.email
    const rmsNumber = afterData.rmsTrackingNumber || afterData.rmsNumber || event.params.requestId
    const deviceModel = afterData.deviceModel || 'DisplayCell Device'
    const estimatedCompletion = afterData.estimatedCompletionDate || '1-3 Business Days'
    const trackingUrl = `https://displaycellpros.com/repair-status?rms=${encodeURIComponent(rmsNumber)}`

    logger.info(
      `Repair status updated for ${rmsNumber}: ${oldStatus} -> ${newStatus}. Triggering email to ${customerEmail}`
    )

    if (!customerEmail) {
      logger.warn(`No customer email found for repair request ${rmsNumber}`)
      return
    }

    if (!sendgridApiKey) {
      logger.warn('SENDGRID_API_KEY environment variable is not configured. Email notification skipped.')
      return
    }

    const msg = {
      to: customerEmail,
      from: 'repairs@displaycellpros.com',
      subject: `[DisplayCellPros] Repair Status Update for ${rmsNumber} (${deviceModel})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <div style="background-color: #0f172a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px;">DisplayCellPros Repair Status Update</h1>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #1e293b;">Hello,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">
              The status of your repair request <strong>${rmsNumber}</strong> for device <strong>${deviceModel}</strong> has been updated.
            </p>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
              <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">New Repair Status</p>
              <p style="margin: 4px 0 0 0; font-size: 18px; color: #047857; font-weight: bold;">${newStatus}</p>
            </div>
            <p style="font-size: 13px; color: #64748b;">
              <strong>Estimated Completion:</strong> ${estimatedCompletion}
            </p>
            <div style="margin-top: 28px; text-align: center;">
              <a href="${trackingUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                Track Live Repair Progress
              </a>
            </div>
          </div>
          <div style="padding: 16px; background-color: #f1f5f9; text-align: center; font-size: 12px; color: #64748b; border-radius: 0 0 8px 8px;">
            DisplayCellPros Cleanroom Repair Facility • Questions? Reply to this email or visit our help center.
          </div>
        </div>
      `,
    }

    try {
      await sgMail.send(msg)
      logger.info(`SendGrid status update email successfully sent to ${customerEmail} for request ${rmsNumber}`)
    } catch (error) {
      logger.error('Error sending SendGrid status update email:', error)
    }
  }
)

export const onRepairStatusChanged = sendRepairStatusEmail
// Supported trigger alias for document updates: onUpdate
export const onUpdate = sendRepairStatusEmail
