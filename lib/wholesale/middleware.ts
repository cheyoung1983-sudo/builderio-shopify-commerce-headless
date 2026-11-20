import type { NextApiRequest, NextApiResponse } from 'next'
import { getAdminEmailFromRequest } from '../tribal/admin-auth'

export interface VerifiedOwnerPartner {
  partnerName: string
  accountUid: string
  pricingTier: 'VIP'
  isOwner: true
  isStaff: true
  verifiedEmail: string
}

/**
 * Strict fail-closed authentication wrapper for all Wholesale Gadget Parts (WGP) routes.
 * Only verified sessions belonging to the two owner allowlist emails
 * (cheyoung1983@gmail.com and ryan@displaycellpros.com) are permitted.
 *
 * All non-production bypasses, preview headers (`x-staff-preview`), header spoofs,
 * unvalidated Bearer strings, and third-party API keys are strictly rejected.
 */
export function withWholesaleAuth(
  handler: (req: NextApiRequest & { partner?: VerifiedOwnerPartner }, res: NextApiResponse) => Promise<any> | any
) {
  return async (req: NextApiRequest & { partner?: VerifiedOwnerPartner }, res: NextApiResponse) => {
    res.setHeader('Cache-Control', 'no-store')

    const verifiedEmail = await getAdminEmailFromRequest(req)
    if (!verifiedEmail) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Verified owner authentication required for Wholesale Gadget Parts access.',
      })
    }

    req.partner = {
      partnerName: 'DisplayCellPros Verified Owner',
      accountUid: verifiedEmail,
      pricingTier: 'VIP',
      isOwner: true,
      isStaff: true,
      verifiedEmail,
    }

    return handler(req, res)
  }
}
