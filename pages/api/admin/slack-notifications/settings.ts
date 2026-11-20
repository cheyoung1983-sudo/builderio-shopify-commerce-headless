import type { NextApiRequest, NextApiResponse } from 'next'
import {
  getAdminNotificationSettings,
  updateAdminNotificationSettings,
} from '../../../../lib/admin-notification-settings'
import { getAdminEmailFromRequest } from '../../../../lib/tribal/admin-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')

  const ownerEmail = await getAdminEmailFromRequest(req)
  if (!ownerEmail) {
    return res.status(403).json({ error: 'Forbidden: Verified owner authentication required.' })
  }

  if (req.method === 'GET') {
    try {
      const settings = await getAdminNotificationSettings()
      return res.status(200).json({ settings })
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to fetch notification settings' })
    }
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    try {
      const updated = await updateAdminNotificationSettings(req.body || {}, ownerEmail)
      return res.status(200).json({ settings: updated, message: 'Settings updated successfully' })
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to update notification settings' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT'])
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
}
