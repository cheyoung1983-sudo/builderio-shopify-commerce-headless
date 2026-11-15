import type { NextApiRequest, NextApiResponse } from 'next'
import { handleAdminRequests } from '../../../../lib/tribal/admin-requests.ts'

/** Admin dashboard list of tribal review records (no seeded/demo data). */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return handleAdminRequests(req, res)
}
