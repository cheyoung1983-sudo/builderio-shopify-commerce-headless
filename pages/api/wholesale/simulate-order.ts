import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  try {
    const { orderId, sku, supplier } = req.body || {}
    const trackingNumber = `1Z99999999${Math.floor(10000000 + Math.random() * 90000000)}`
    const carrier = 'UPS Ground'

    return res.status(200).json({
      success: true,
      message: 'Simulated tracking ingestion webhook received from supplier.',
      orderId: orderId || 'DCP-ORD-984210',
      sku: sku || 'MS-OLED-IP14-PRO',
      supplier: supplier || 'MobileSentrix',
      fulfillment: {
        status: 'fulfilled',
        carrier,
        trackingNumber,
        trackingUrl: `https://www.ups.com/track?tracknum=${trackingNumber}`,
        timestamp: new Date().toISOString(),
        shopifyFulfillmentMutation: 'SUCCESS',
        customerNotificationTriggered: true,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to simulate order fulfillment.' })
  }
}
