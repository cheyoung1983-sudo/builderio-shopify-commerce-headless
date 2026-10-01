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
      passcodeProvided: '[wiped_no_lock]',
      notes: 'Battery drain down to 10% in 2 hours. Rapid charging failure.',
      cosmeticCondition: 'Mint / Like New',
    },
    shippingKit: {
      recipientName: 'Sarah Begay',
      email: 'sarah.begay@example.com',
      phone: '(555) 234-5678',
      address: {
        street: '450 Desert Bloom Rd',
        city: 'Tucson',
        state: 'AZ',
        zip: '85701',
      },
      courierPreference: 'FEDEX_OVERNIGHT',
      kitType: 'electrostatic_foam_mailer',
      inboundTracking: '782910482019',
      dispatchedAt: new Date(Date.now() - 20 * 3600000).toISOString(),
    },
    technicianLog: [
      { timestamp: new Date(Date.now() - 20 * 3600000).toISOString(), event: 'Prepaid FedEx shipping kit dispatched.' },
      { timestamp: new Date(Date.now() - 6 * 3600000).toISOString(), event: 'Customer deposited package at FedEx drop box. Inbound transit active.' },
    ],
    estimatedCompletion: 'Tomorrow by 2:00 PM MST',
    createdAt: new Date(Date.now() - 20 * 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  const { rms } = req.query
  if (!rms || typeof rms !== 'string') {
    return res.status(400).json({ success: false, error: 'RMS tracking number is required.' })
  }

  const cleanRms = rms.trim().toUpperCase()

  try {
    // 1. Check Firestore
    if (db) {
      try {
        const docRef = doc(db, 'repair_requests', cleanRms)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          return res.status(200).json({
            success: true,
            record: docSnap.data(),
          })
        }
      } catch (firestoreErr: any) {
        console.warn('[Repair Status API] Firestore read warning:', firestoreErr?.message)
      }
    }

    // 2. Check Demo fallback records
    if (DEMO_RECORDS[cleanRms]) {
      return res.status(200).json({
        success: true,
        record: DEMO_RECORDS[cleanRms],
      })
    }

    return res.status(404).json({
      success: false,
      error: `Repair request with tracking number "${cleanRms}" was not found. Please verify the format (e.g. DCP-RMS-XXXXXX).`,
    })
  } catch (err: any) {
    console.error('Error in Repair Status API:', err)
    return res.status(500).json({
      success: false,
      error: 'Internal server error querying repair status.',
      details: err?.message,
    })
  }
}
