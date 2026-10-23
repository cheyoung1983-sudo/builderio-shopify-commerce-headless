/**
 * Customer-safe repair status lookup.
 *
 * Only these fields ever leave the server. Passcodes, IMEI/serial numbers,
 * addresses, phone numbers, notes and photos are never returned.
 */
export interface RepairStatusSummary {
  rmsNumber: string
  deviceModel: string
  status: string
  updatedAt?: string
  estimatedCompletion?: string
}

export interface RepairRecordSource {
  /** Returns the stored record for an RMS number, or null. */
  get(rms: string): Promise<Record<string, unknown> | null>
}

const RMS_PATTERN = /^[A-Z0-9-]{4,40}$/
const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,190}$/

export function normalizeLookupInput(rawRms: unknown, rawEmail: unknown): { rms: string; email: string } | null {
  if (typeof rawRms !== 'string' || typeof rawEmail !== 'string') return null
  const rms = rawRms.trim().toUpperCase()
  const email = rawEmail.trim().toLowerCase()
  if (!RMS_PATTERN.test(rms) || !EMAIL_PATTERN.test(email)) return null
  return { rms, email }
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 && v.length <= 200 ? v : undefined
}

function toIso(v: unknown): string | undefined {
  if (typeof v === 'string') return str(v)
  if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().toISOString()
  }
  return undefined
}

/** Picks only the customer-safe fields from a stored record. */
export function toSafeSummary(rms: string, record: Record<string, unknown>): RepairStatusSummary {
  const item = (record.itemDetails ?? {}) as Record<string, unknown>
  const model = [str(item.deviceBrand), str(item.deviceModel)].filter(Boolean).join(' ')
  return {
    rmsNumber: rms,
    deviceModel: model || 'Device',
    status: str(record.status) ?? 'kit_dispatched',
    updatedAt: toIso(record.updatedAt),
    estimatedCompletion: str(record.estimatedCompletion),
  }
}

function recordEmail(record: Record<string, unknown>): string {
  const kit = (record.shippingKit ?? {}) as Record<string, unknown>
  const e = str(kit.email) ?? str(record.email) ?? ''
  return e.toLowerCase()
}

/**
 * Looks up a repair. Returns null for "not found" and "email mismatch" alike,
 * so callers can't tell the two apart.
 */
export async function lookupRepair(
  source: RepairRecordSource | null,
  rms: string,
  email: string
): Promise<RepairStatusSummary | null> {
  if (!source) return null
  let record: Record<string, unknown> | null = null
  try {
    record = await source.get(rms)
  } catch {
    record = null
  }
  if (!record || recordEmail(record) !== email) return null
  return toSafeSummary(rms, record)
}
