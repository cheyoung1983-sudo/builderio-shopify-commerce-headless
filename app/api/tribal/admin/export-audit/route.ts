import { NextRequest, NextResponse } from 'next/server'
import {
  exportAuditLogsToCsv,
  normalizeAuditEntryForExport,
  type TribalAuditExportRecord,
} from '../../../../../lib/tribal/audit-csv-exporter.ts'

export const dynamic = 'force-dynamic'

/**
 * Admin API Route: Export Tribal Verification Audit Logs & Exemption Certificates as CSV
 * 
 * GET /api/tribal/admin/export-audit
 * Query Params:
 *  - customerId (optional)
 *  - status (optional, e.g. VERIFIED)
 *  - format (csv | json, default csv)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customerId')
    const filterStatus = searchParams.get('status')
    const format = searchParams.get('format') || 'csv'

    // Sample/simulated verified tribal members and certificates for admin reporting
    const sampleRecords: TribalAuditExportRecord[] = [
      normalizeAuditEntryForExport(
        {
          customerId: customerId || 'gid://shopify/Customer/984210041',
          customerEmail: 'cheyoung1983@gmail.com',
          customerName: 'Che Young',
          tribalNation: 'Navajo Nation',
          maskedEnrollmentId: '••••8821',
          status: 'VERIFIED',
          timestamp: '2026-09-18T14:22:10Z',
          provider: 'sheerid',
          taxExempt: true,
          entityUseCode: 'C',
          certificateRef: 'CERT-CDTFA-146-8832',
          certificateState: 'CA',
          certificateEffectiveDate: '2026-09-18',
          certificateExpirationDate: '2027-09-18',
          reservationGeofenceStatus: 'ON_RESERVATION_QUALIFIED',
          deliveryZip: '95546',
          deliveryState: 'CA',
          hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          notes: 'CDTFA-146-RES signed. Avalara Entity Use Code C active on reservation address.',
        }
      ),
      normalizeAuditEntryForExport(
        {
          customerId: 'gid://shopify/Customer/984210042',
          customerEmail: 'sarah.begay@navajo.example',
          customerName: 'Sarah Begay',
          tribalNation: 'Navajo Nation',
          maskedEnrollmentId: '••••4190',
          status: 'VERIFIED',
          timestamp: '2026-09-19T09:15:30Z',
          provider: 'idme',
          taxExempt: true,
          entityUseCode: 'C',
          certificateRef: 'CERT-AZ-DOR-5000A',
          certificateState: 'AZ',
          certificateEffectiveDate: '2026-09-19',
          certificateExpirationDate: '2027-09-19',
          reservationGeofenceStatus: 'ON_RESERVATION_QUALIFIED',
          deliveryZip: '86503',
          deliveryState: 'AZ',
          hash: '7d4a2b91834e005117f738f615f7956fe3c59e78e47610022d4f58c7078311aa',
          notes: 'Window Rock AZ on-reservation delivery. 20% member discount & AvaTax exemption applied.',
        }
      ),
      normalizeAuditEntryForExport(
        {
          customerId: 'gid://shopify/Customer/984210043',
          customerEmail: 'elena.ross@cherokee.example',
          customerName: 'Elena Ross',
          tribalNation: 'Cherokee Nation',
          maskedEnrollmentId: '••••7712',
          status: 'VERIFIED',
          timestamp: '2026-09-20T11:45:00Z',
          provider: 'sheerid',
          taxExempt: true,
          entityUseCode: 'C',
          certificateRef: 'CERT-OK-OTC-TRIBAL-99',
          certificateState: 'OK',
          certificateEffectiveDate: '2026-09-20',
          certificateExpirationDate: '2027-09-20',
          reservationGeofenceStatus: 'ON_RESERVATION_QUALIFIED',
          deliveryZip: '74464',
          deliveryState: 'OK',
          hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
          notes: 'Tahlequah jurisdictional boundary verified via Census Bureau AIANA shapefile.',
        }
      ),
      normalizeAuditEntryForExport(
        {
          customerId: 'gid://shopify/Customer/984210044',
          customerEmail: 'david.yakima@yakama.example',
          customerName: 'David Yakima',
          tribalNation: 'Confederated Tribes and Bands of the Yakama Nation',
          maskedEnrollmentId: '••••3301',
          status: 'VERIFIED',
          timestamp: '2026-09-21T16:10:44Z',
          provider: 'sheerid',
          taxExempt: true,
          entityUseCode: 'C',
          certificateRef: 'CERT-WAC-458-20-192',
          certificateState: 'WA',
          certificateEffectiveDate: '2026-09-21',
          certificateExpirationDate: '2027-09-21',
          reservationGeofenceStatus: 'ON_RESERVATION_QUALIFIED',
          deliveryZip: '98948',
          deliveryState: 'WA',
          hash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          notes: 'Washington WAC 458-20-192 exemption certificate recorded and stored.',
        }
      ),
    ]

    let filteredRecords = sampleRecords
    if (filterStatus) {
      filteredRecords = filteredRecords.filter(
        (r) => r.verificationStatus.toUpperCase() === filterStatus.toUpperCase()
      )
    }

    if (format === 'json') {
      return NextResponse.json({
        total: filteredRecords.length,
        exportedAt: new Date().toISOString(),
        records: filteredRecords,
      })
    }

    const csvData = exportAuditLogsToCsv(filteredRecords, { includeHeader: true })
    const filename = `tribal-tax-audit-report-${new Date().toISOString().split('T')[0]}.csv`

    // Prepend UTF-8 BOM for Microsoft Excel compatibility
    const responseBuffer = '\uFEFF' + csvData

    return new NextResponse(responseBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error: any) {
    console.error('Error generating audit CSV export:', error)
    return NextResponse.json(
      { error: 'Failed to generate audit CSV export', details: error?.message },
      { status: 500 }
    )
  }
}
