import type { NextApiRequest, NextApiResponse } from 'next'
import { evaluateAddressGeofence } from '../../../lib/tribal/geofencing'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { address1, city, province, zip, country } = req.query
    const result = evaluateAddressGeofence({
      address1: address1 as string,
      city: city as string,
      province: province as string,
      zip: zip as string,
      country: country as string,
    })
    return res.status(200).json(result)
  }

  if (req.method === 'POST') {
    const address = req.body
    if (!address) {
      return res.status(400).json({ error: 'Address payload is required.' })
    }
    const result = evaluateAddressGeofence(address)
    return res.status(200).json(result)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Method Not Allowed' })
}
