import type { NextApiRequest, NextApiResponse } from 'next'
import {
  exportAuditLogsToCsv,
  type TribalAuditExportRecord,
} from '../../../../lib/tribal/audit-csv-exporter.ts'
import { rejectMethod } from '../../../../lib/api/read-raw-body.ts'

/**
 * Admin API Route: Export Tribal Verification Audit Logs & Exemption Certificates as CSV
 * Moved from app/api/tribal/admin/export-audit/route.ts (pure move). Guarded by proxy.ts.
 *
 * GET /api/tribal/admin/export-audit
 * Query Params:
 *  - customerId (optional)
 *  - status (optional, e.g. VERIFIED)
 *  - format (csv | json, default csv)
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (rejectMethod(req, res, ['GET', 'HEAD', 'OPTIONS'])) return
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS')
    return res.status(204).end()
  }
  try {
    const searchParams = new URL(req.url || '/', 'http://localhost').searchParams
    const filterStatus = searchParams.get('status')
    const format = searchParams.get('format') || 'csv'

    // No fabricated audit rows: until the export reads real decision records, it returns an
    // empty (headers-only) report. The previous hardcoded sample rows included real personal data.
    const records: TribalAuditExportRecord[] = []

    let filteredRecords = records
    if (filterStatus) {
      filteredRecords = filteredRecords.filter(
        (r) => r.verificationStatus.toUpperCase() === filterStatus.toUpperCase()
      )
    }

    if (format === 'json') {
      return res.status(200).json({
        total: filteredRecords.length,
        exportedAt: new Date().toISOString(),
        records: filteredRecords,
      })
    }

    const csvData = exportAuditLogsToCsv(filteredRecords, { includeHeader: true })
    const filename = `tribal-tax-audit-report-${new Date().toISOString().split('T')[0]}.csv`

    // Prepend UTF-8 BOM for Microsoft Excel compatibility
    const responseBuffer = '\uFEFF' + csvData

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    return res.status(200).send(responseBuffer)
  } catch (error: any) {
    console.error('Error generating audit CSV export:', error)
    return res
      .status(500)
      .json({ error: 'Failed to generate audit CSV export', details: error?.message })
  }
}
