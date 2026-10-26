import type { NextApiRequest, NextApiResponse } from 'next'
import {
  getAdminNotificationSettings,
  updateAdminNotificationSettings,
} from '../../../../lib/admin-notification-settings'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      const updatedBy = (req.headers['x-user-email'] as string) || 'admin'
      const updated = await updateAdminNotificationSettings(req.body || {}, updatedBy)
      return res.status(200).json({ settings: updated, message: 'Settings updated successfully' })
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to update notification settings' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT'])
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
}
