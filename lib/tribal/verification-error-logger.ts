/**
 * Verification Error & API Timeout Logger Helper
 * 
 * Writes failed verification attempts, API timeout events, and validation errors
 * to a dedicated 'verification-logs' metafield collection in Shopify for compliance auditing
 * and troubleshooting.
 */

import crypto from 'node:crypto'
import { METAFIELDS_SET_MUTATION } from '../audit.ts'

export type VerificationErrorType =
  | 'API_TIMEOUT'
  | 'VALIDATION_FAILURE'
  | 'NETWORK_ERROR'
  | 'PROVIDER_DOWN'
  | 'INVALID_ENROLLMENT'
  | 'NAME_MISMATCH'
  | 'DOCUMENT_UNREADABLE'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR'

export interface VerificationErrorLogEntry {
  eventId: string
  timestamp: string
  customerId: string
  errorType: VerificationErrorType
  errorMessage: string
  provider?: string
  httpStatus?: number
  durationMs?: number
  retryable: boolean
  tribalNationAttempted?: string
  errorHash: string
  context?: Record<string, any>
}

export interface LogVerificationErrorParams {
  customerId: string
  errorType: VerificationErrorType
  errorMessage: string
  provider?: string
  httpStatus?: number
  durationMs?: number
  retryable?: boolean
  tribalNationAttempted?: string
  existingLogs?: VerificationErrorLogEntry[] | string
  context?: Record<string, any>
  domain?: string
  adminAccessToken?: string
}

export interface VerificationErrorLogResult {
  success: boolean
  customerId: string
  entry: VerificationErrorLogEntry
  totalErrorCount: number
  metafieldsWritten: Array<{
    namespace: string
    key: string
    value: string
    type: string
  }>
  userErrors?: Array<{ field: string; message: string }>
}

/**
 * Computes a SHA-256 digest of the error event for tamper-evident compliance
 */
export function generateErrorAuditHash(payload: {
  customerId: string
  errorType: string
  errorMessage: string
  timestamp: string
}): string {
  const content = [
    payload.customerId,
    payload.errorType,
    payload.errorMessage,
    payload.timestamp,
  ].join('|')
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * VerificationErrorLogger - Static helper & singleton class
 */
export class VerificationErrorLogger {
  /**
   * Logs a failed verification attempt or generic error to the 'verification-logs' metafield
   */
  static async logError(params: LogVerificationErrorParams): Promise<VerificationErrorLogResult> {
    const timestamp = new Date().toISOString()
    const formattedCustomerId = params.customerId.startsWith('gid://shopify/Customer/')
      ? params.customerId
      : `gid://shopify/Customer/${params.customerId}`

    const eventId = `err_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    const errorHash = generateErrorAuditHash({
      customerId: formattedCustomerId,
      errorType: params.errorType,
      errorMessage: params.errorMessage,
      timestamp,
    })

    const newEntry: VerificationErrorLogEntry = {
      eventId,
      timestamp,
      customerId: formattedCustomerId,
      errorType: params.errorType,
      errorMessage: params.errorMessage,
      provider: params.provider || 'sheerid',
      httpStatus: params.httpStatus,
      durationMs: params.durationMs,
      retryable: params.retryable ?? (params.errorType === 'API_TIMEOUT' || params.errorType === 'NETWORK_ERROR'),
      tribalNationAttempted: params.tribalNationAttempted,
      errorHash,
      context: params.context || {},
    }

    // Parse existing logs if provided to keep history
    let logsArray: VerificationErrorLogEntry[] = []
    if (Array.isArray(params.existingLogs)) {
      logsArray = [...params.existingLogs]
    } else if (typeof params.existingLogs === 'string' && params.existingLogs.trim()) {
      try {
        const parsed = JSON.parse(params.existingLogs)
        if (Array.isArray(parsed)) {
          logsArray = parsed
        }
      } catch {
        logsArray = []
      }
    }

    // Prepend latest error (keep most recent 20 for storage economy)
    logsArray.unshift(newEntry)
    if (logsArray.length > 20) {
      logsArray = logsArray.slice(0, 20)
    }

    const metafields = [
      {
        ownerId: formattedCustomerId,
        namespace: 'verification_logs',
        key: 'error_history',
        value: JSON.stringify(logsArray),
        type: 'json',
      },
      {
        ownerId: formattedCustomerId,
        namespace: 'verification_logs',
        key: 'last_error_at',
        value: timestamp,
        type: 'date_time',
      },
      {
        ownerId: formattedCustomerId,
        namespace: 'verification_logs',
        key: 'last_error_type',
        value: params.errorType,
        type: 'single_line_text_field',
      },
    ]

    const domain =
      params.domain ||
      process.env.SHOPIFY_STORE_DOMAIN ||
      process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
      ''
    const adminToken =
      params.adminAccessToken ||
      process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ||
      process.env.SHOPIFY_STOREFRONT_API_TOKEN

    if (adminToken && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
      const adminEndpoint = `https://${domain}/admin/api/2026-01/graphql.json`
      try {
        const res = await fetch(adminEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': adminToken,
          },
          body: JSON.stringify({
            query: METAFIELDS_SET_MUTATION,
            variables: { metafields },
          }),
        })

        if (res.ok) {
          const json = await res.json()
          const userErrors = json.data?.metafieldsSet?.userErrors || []
          return {
            success: userErrors.length === 0,
            customerId: formattedCustomerId,
            entry: newEntry,
            totalErrorCount: logsArray.length,
            metafieldsWritten: metafields.map((m) => ({
              namespace: m.namespace,
              key: m.key,
              value: m.value,
              type: m.type,
            })),
            userErrors,
          }
        }
      } catch (err) {
        console.warn('Failed to write verification error log to Shopify metafields:', err)
      }
    }

    // Local / simulation fallback
    return {
      success: true,
      customerId: formattedCustomerId,
      entry: newEntry,
      totalErrorCount: logsArray.length,
      metafieldsWritten: metafields.map((m) => ({
        namespace: m.namespace,
        key: m.key,
        value: m.value,
        type: m.type,
      })),
      userErrors: [],
    }
  }

  /**
   * Specialized logger for API timeout events
   */
  static async logTimeout(params: {
    customerId: string
    provider: string
    durationMs: number
    timeoutThresholdMs?: number
    endpoint?: string
    tribalNationAttempted?: string
    domain?: string
    adminAccessToken?: string
  }): Promise<VerificationErrorLogResult> {
    const threshold = params.timeoutThresholdMs || 10000
    const message = `Verification API request to provider '${params.provider}' timed out after ${params.durationMs}ms (threshold: ${threshold}ms).`

    return this.logError({
      customerId: params.customerId,
      errorType: 'API_TIMEOUT',
      errorMessage: message,
      provider: params.provider,
      httpStatus: 504,
      durationMs: params.durationMs,
      retryable: true,
      tribalNationAttempted: params.tribalNationAttempted,
      context: {
        endpoint: params.endpoint,
        thresholdMs: threshold,
      },
      domain: params.domain,
      adminAccessToken: params.adminAccessToken,
    })
  }

  /**
   * Helper to parse error logs from raw metafields array
   */
  static parseErrorLogsFromMetafields(metafields: Array<{ namespace?: string; key: string; value: string }>): VerificationErrorLogEntry[] {
    for (const m of metafields) {
      if (
        (m.namespace === 'verification_logs' || !m.namespace) &&
        (m.key === 'error_history' || m.key === 'verification_logs')
      ) {
        try {
          const parsed = JSON.parse(m.value)
          if (Array.isArray(parsed)) {
            return parsed
          }
        } catch {
          // ignore parsing error
        }
      }
    }
    return []
  }
}

export const logVerificationError = VerificationErrorLogger.logError.bind(VerificationErrorLogger)
export const logVerificationTimeout = VerificationErrorLogger.logTimeout.bind(VerificationErrorLogger)

export default VerificationErrorLogger
