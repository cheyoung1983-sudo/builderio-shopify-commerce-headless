import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@lib/db';
import { wholesaleAccounts } from '@lib/db/schema/wholesale';
import { eq } from 'drizzle-orm';

/**
 * Persona Webhook Handler
 * Listens for inquiry completion events to update Tribal ID verification status.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { event, data } = req.body;

    // We only care about completed inquiries
    if (event !== 'inquiry.completed') {
      return res.status(200).json({ success: true, message: 'Event ignored' });
    }

    const { account_id, fields } = data;
    const tribalId = fields?.tribal_id;
    const isVerified = data.status === 'approved';

    if (!account_id) {
      throw new Error('Missing account_id in Persona payload');
    }

    // Update the wholesale account verification status in our mirror DB
    // We assume account_id from Persona maps to uid in wholesaleAccounts
    await db
      .update(wholesaleAccounts)
      .set({
        tribalId: tribalId || null,
        isVerified: isVerified,
        updatedAt: new Date(),
      })
      .where(eq(wholesaleAccounts.uid, account_id));

    return res.status(200).json({
      success: true,
      message: `Verification status updated for ${account_id}`,
    });
  } catch (error: any) {
    console.error('[Persona Webhook Error]:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
}
