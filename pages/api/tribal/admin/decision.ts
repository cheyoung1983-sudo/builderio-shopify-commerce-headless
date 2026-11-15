import type { NextApiRequest, NextApiResponse } from 'next'
import { handleAdminDecision } from '../../../../lib/tribal/admin-decision.ts'

/** Admin Approve / Deny. See lib/tribal/admin-decision.ts for the reviewer-gating rules. */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return handleAdminDecision(req, res)
}
