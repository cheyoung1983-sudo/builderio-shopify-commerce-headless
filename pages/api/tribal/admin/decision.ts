import type { NextApiRequest, NextApiResponse } from 'next'
import { isAdminSession, getAdminEmailFromRequest } from '../../../../lib/tribal/admin-auth'
import { updateShopifyCustomerTribalStatus } from '../../../../lib/tribal/shopify-admin'
import { isSlackConfigured, postReviewToSlack } from '../../../../lib/tribal/manual-review'
import { db } from '../../../../lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  const adminEmail = getAdminEmailFromRequest(req)
  if (!adminEmail || !isAdminSession(req)) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Only authorized administrators (ryan@displaycellpros.com, cheyoung1983@gmail.com) can manage decisions.',
    })
  }

  const { requestId, customerId, action, notes } = req.body || {}

  if (!requestId || !['approve', 'deny'].includes(action)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request: requestId and action ("approve" | "deny") are required.',
    })
  }

  const isApproval = action === 'approve'
  const newStatus = isApproval ? 'approved' : 'denied'

  let shopifySynced = false
  let shopifyError: string | null = null

  // 1. If approved and customer ID provided, tag customer in Shopify
  if (isApproval && customerId && customerId !== 'guest') {
    try {
      const shopifyRes = await updateShopifyCustomerTribalStatus({
        customerId,
        tagsToAdd: ['tribal-member-verified'],
        taxExempt: false, // On-reservation delivery checked per order
        audit: {
          verificationHash: `admin_approved_${Date.now()}`,
          verifiedAt: new Date().toISOString(),
          tribalNation: 'Verified Tribal Member',
          maskedEnrollmentId: '••••VERIFIED',
          certificateRef: `Admin Approval by ${adminEmail}`,
        },
      })
      shopifySynced = shopifyRes.success
      if (!shopifyRes.success) {
        shopifyError = shopifyRes.userErrors?.[0]?.message || 'Shopify tagging failed.'
      }
    } catch (err: any) {
      shopifyError = err?.message || 'Shopify update error.'
    }
  }

  // 2. Persist decision in Firestore
  if (db && requestId) {
    try {
      const docRef = doc(db, 'tribal_verifications', requestId)
      await setDoc(
        docRef,
        {
          status: newStatus,
          decidedBy: adminEmail,
          decidedAt: new Date().toISOString(),
          adminNotes: notes || '',
          shopifySynced,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    } catch (fsErr: any) {
      console.warn('Admin decision: Firestore update warning:', fsErr?.message)
    }
  }

  // 3. Post Slack update if configured
  if (isSlackConfigured()) {
    try {
      await postReviewToSlack({
        id: requestId,
        customerName: 'Tribal Member Request',
        tribalNation: 'Verified Member',
        status: newStatus,
        createdAt: new Date().toISOString(),
      } as any)
    } catch (slackErr: any) {
      console.warn('Admin decision: Slack notification warning:', slackErr?.message)
    }
  }

  return res.status(200).json({
    success: true,
    requestId,
    status: newStatus,
    decidedBy: adminEmail,
    shopifySynced,
    shopifyError,
    message: isApproval
      ? `Verification request ${requestId} APPROVED by ${adminEmail}.${shopifySynced ? ' Customer tagged tribal-member-verified in Shopify.' : ''}`
      : `Verification request ${requestId} DENIED by ${adminEmail}.`,
  })
}
