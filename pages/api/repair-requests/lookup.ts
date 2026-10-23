import type { NextApiRequest, NextApiResponse } from 'next'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'

// Fallback seed records for testing and demo tracking numbers
const DEMO_RECORDS: Record<string, any> = {
  'DCP-RMS-100001': {
    rmsNumber: 'DCP-RMS-100001',
    status: 'bench_diagnostic',
    currentStage: 3,
    claimedByUid: 'guest',
    itemDetails: {
      deviceBrand: 'Apple',
      deviceModel: 'iPhone 15 Pro Max',
      serialOrImei: '359281048201948',
      symptoms: ['screen_cracked', 'port_audio'],
      imageUrls: [
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=600&auto=format&fit=crop&q=80',
      ],
      passcodeProvided: '123456',
      notes: 'Customer reported green vertical line across OLED after drop. Front glass shattered.',
      cosmeticCondition: 'Minor wear / Light frame scratches',
    },
    shippingKit: {
      recipientName: 'Che Young',
      email: 'cheyoung1983@gmail.com',
      phone: '(555) 019-2834',
      address: {
        street: '123 Tribal Way',
        apartment: 'Suite 204',
        city: 'Window Rock',
        state: 'AZ',
        zip: '86515',
      },
      courierPreference: 'UPS_OVERNIGHT',
      kitType: 'electrostatic_foam_mailer',
      inboundTracking: '1Z9999999999999999',
      dispatchedAt: new Date(Date.now() - 36 * 3600000).toISOString(),
      receivedAtLab: new Date(Date.now() - 4 * 3600000).toISOString(),
    },
    technicianLog: [
      { timestamp: new Date(Date.now() - 36 * 3600000).toISOString(), event: 'Prepaid UPS overnight shipping kit dispatched to customer.' },
      { timestamp: new Date(Date.now() - 14 * 3600000).toISOString(), event: 'Inbound package scanned at UPS Phoenix Air Hub.' },
      { timestamp: new Date(Date.now() - 4 * 3600000).toISOString(), event: 'Received at Cleanroom Station 4. Intake photos logged & bench diagnostic initiated.' },
      { timestamp: new Date(Date.now() - 1 * 3600000).toISOString(), event: 'OEM OLED assembly fitted and display bus verified.' },
    ],
    estimatedCompletion: 'Today at 5:00 PM MST',
    createdAt: new Date(Date.now() - 36 * 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  'DCP-RMS-100002': {
    rmsNumber: 'DCP-RMS-100002',
    status: 'inbound_transit',
    currentStage: 2,
    claimedByUid: 'guest',
    itemDetails: {
      deviceBrand: 'Samsung',
      deviceModel: 'Galaxy S24 Ultra',
      serialOrImei: 'R5CW109482L',
      symptoms: ['battery_degraded'],
      imageUrls: [],
      passcodeProvided: '',
      notes: 'Battery drains in under 2 hours. Slight back glass separation from pouch expansion.',
      cosmeticCondition: 'Pristine / No drops',
    },
    shippingKit: {
      recipientName: 'Sarah Jenkins',
      email: 'customer@example.com',
      phone: '(509) 555-0144',
      address: {
        street: '456 Riverside Ave',
        city: 'Spokane',
        state: 'WA',
        zip: '99201',
      },
      courierPreference: 'USPS_PRIORITY',
      kitType: 'electrostatic_foam_mailer',
      inboundTracking: '9405511206213019823412',
      dispatchedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    },
    technicianLog: [
      { timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), event: 'Prepaid electrostatic return mailer generated.' },
      { timestamp: new Date(Date.now() - 6 * 3600000).toISOString(), event: 'Accepted at USPS Spokane sorting facility.' },
    ],
    estimatedCompletion: 'Tomorrow by 2:00 PM PST',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const rawRms = (req.method === 'POST' ? req.body?.rms : req.query.rms) as string | undefined
  const rawEmail = (req.method === 'POST' ? req.body?.email : req.query.email) as string | undefined

  if (!rawRms || !rawEmail) {
    return res.status(400).json({
      success: false,
      error: 'Both Repair Request ID (RMS#) and Email Address are required for secure lookup.',
    })
  }

  const cleanRms = rawRms.trim().toUpperCase()
  const cleanEmail = rawEmail.trim().toLowerCase()

  // 1. Try querying Firestore
  if (db) {
    try {
      const docRef = doc(db, 'repair_requests', cleanRms)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        const recordEmail = (data.shippingKit?.email || data.email || '').toLowerCase()

        if (recordEmail === cleanEmail) {
          return res.status(200).json({
            success: true,
            record: data,
          })
        }
      }
    } catch (err: any) {
      console.warn('[Repair Lookup API] Firestore error:', err?.message)
    }
  }

  // 2. Try demo records fallback
  const demoRecord = DEMO_RECORDS[cleanRms]
  if (demoRecord) {
    const demoEmail = (demoRecord.shippingKit?.email || demoRecord.email || '').toLowerCase()
    if (demoEmail === cleanEmail) {
      return res.status(200).json({
        success: true,
        record: demoRecord,
      })
    }
  }

  // 3. Not found or email mismatched (uniform error to prevent enumeration)
  return res.status(404).json({
    success: false,
    error: `No repair request found matching RMS ID "${cleanRms}" and email "${cleanEmail}". Please double-check your receipt or shipping confirmation email.`,
  })
}
