import type { NextApiRequest, NextApiResponse } from 'next'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'

export interface MailInRepairPayload {
  rmsNumber?: string
  claimedByUid?: string
  itemDetails: {
    deviceBrand: string
    deviceModel: string
    serialOrImei?: string
    symptoms: string[]
    imageUrls?: string[]
    passcodeProvided?: string
    notes?: string
    cosmeticCondition?: string
  }
  shippingKit: {
    recipientName: string
    email: string
    phone: string
    address: {
      street: string
      apartment?: string
      city: string
      state: string
      zip: string
    }
    courierPreference: 'UPS_OVERNIGHT' | 'FEDEX_OVERNIGHT' | 'USPS_PRIORITY'
    kitType: 'electrostatic_foam_mailer' | 'prepaid_label_only'
  }
  sopChecklist: {
    backedUp: boolean
    locksDisabled: boolean
    batteryUnder30: boolean
    accessoriesRemoved: boolean
  }
  estimatedCost?: {
    part: number
    labor: number
    shipping: number
    total: number
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST.',
    })
  }

  try {
    const payload = req.body as MailInRepairPayload

    if (!payload || !payload.itemDetails || !payload.shippingKit) {
      return res.status(400).json({
        success: false,
        error: 'Missing required item details or shipping kit information.',
      })
    }

    const { itemDetails, shippingKit, sopChecklist, claimedByUid, estimatedCost } = payload

    if (!itemDetails.deviceModel || !itemDetails.deviceBrand) {
      return res.status(400).json({
        success: false,
        error: 'Device brand and model are required.',
      })
    }

    if (!shippingKit.recipientName || !shippingKit.email || !shippingKit.address?.street || !shippingKit.address?.zip) {
      return res.status(400).json({
        success: false,
        error: 'Complete shipping address (Name, Email, Street, ZIP) is required for shipping kit dispatch.',
      })
    }

    // Generate unique RMS Tracking Number
    const rmsNumber = payload.rmsNumber || `DCP-RMS-${Math.floor(100000 + Math.random() * 900000)}`

    const repairRecord = {
      rmsNumber,
      status: 'kit_requested',
      claimedByUid: claimedByUid || 'guest',
      itemDetails: {
        deviceBrand: itemDetails.deviceBrand.trim(),
        deviceModel: itemDetails.deviceModel.trim(),
        serialOrImei: (itemDetails.serialOrImei || '').trim(),
        symptoms: itemDetails.symptoms || [],
        imageUrls: itemDetails.imageUrls || [],
        passcodeProvided: (itemDetails.passcodeProvided || '').trim(),
        notes: (itemDetails.notes || '').trim(),
        cosmeticCondition: itemDetails.cosmeticCondition || 'good',
      },
      shippingKit: {
        recipientName: shippingKit.recipientName.trim(),
        email: shippingKit.email.trim().toLowerCase(),
        phone: (shippingKit.phone || '').trim(),
        address: {
          street: shippingKit.address.street.trim(),
          apartment: (shippingKit.address.apartment || '').trim(),
          city: shippingKit.address.city.trim(),
          state: shippingKit.address.state.trim().toUpperCase(),
          zip: shippingKit.address.zip.trim(),
        },
        courierPreference: shippingKit.courierPreference || 'UPS_OVERNIGHT',
        kitType: shippingKit.kitType || 'electrostatic_foam_mailer',
        dispatchedAt: new Date().toISOString(),
      },
      sopChecklist: {
        backedUp: Boolean(sopChecklist?.backedUp),
        locksDisabled: Boolean(sopChecklist?.locksDisabled),
        batteryUnder30: Boolean(sopChecklist?.batteryUnder30),
        accessoriesRemoved: Boolean(sopChecklist?.accessoriesRemoved),
      },
      estimatedCost: estimatedCost || {
        part: 129.99,
        labor: 35.0,
        shipping: 0.0,
        total: 164.99,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Write to Firestore if connected
    if (db) {
      try {
        const docRef = doc(db, 'repair_requests', rmsNumber)
        await setDoc(docRef, {
          ...repairRecord,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } catch (firestoreErr: any) {
        console.warn('[RepairRequests API] Firestore write warning:', firestoreErr?.message)
      }
    }

    return res.status(200).json({
      success: true,
      rmsNumber,
      status: 'kit_requested',
      message: `Mail-in repair request created. Prepaid shipping kit will be dispatched to ${shippingKit.recipientName}.`,
      record: repairRecord,
    })
  } catch (err: any) {
    console.error('Error creating repair request:', err)
    return res.status(500).json({
      success: false,
      error: 'Internal server error processing repair request.',
      details: err?.message || 'Unknown error',
    })
  }
}
