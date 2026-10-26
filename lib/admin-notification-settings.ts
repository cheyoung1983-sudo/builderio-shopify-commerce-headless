import { db } from './firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

export interface AdminNotificationSettings {
  slackAlertOnTaskFailureLimitExceeded: boolean
  taskFailureRetryThreshold: number
  slackWebhookUrl: string
  slackChannel: string
  queueAutoRetry: boolean
  updatedAt?: string
  updatedBy?: string
}

const DEFAULT_SETTINGS: AdminNotificationSettings = {
  slackAlertOnTaskFailureLimitExceeded: true,
  taskFailureRetryThreshold: 5,
  slackWebhookUrl: process.env.SLACK_TRIBAL_WEBHOOK_URL || process.env.SECURITY_SLACK_WEBHOOK_URL || '',
  slackChannel: process.env.SLACK_TRIBAL_CHANNEL_ID || '#alerts',
  queueAutoRetry: true,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
}

let cachedSettings: AdminNotificationSettings | null = null

export async function getAdminNotificationSettings(): Promise<AdminNotificationSettings> {
  if (cachedSettings) {
    return { ...cachedSettings }
  }

  // In test environment, avoid network calls to Firestore
  if (process.env.NODE_ENV === 'test') {
    cachedSettings = { ...DEFAULT_SETTINGS }
    return { ...cachedSettings }
  }

  try {
    if (db) {
      const docRef = doc(db, 'admin_settings', 'slack_notifications')
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        const data = snap.data()
        cachedSettings = {
          slackAlertOnTaskFailureLimitExceeded: data.slackAlertOnTaskFailureLimitExceeded ?? DEFAULT_SETTINGS.slackAlertOnTaskFailureLimitExceeded,
          taskFailureRetryThreshold: Number(data.taskFailureRetryThreshold ?? DEFAULT_SETTINGS.taskFailureRetryThreshold),
          slackWebhookUrl: data.slackWebhookUrl || DEFAULT_SETTINGS.slackWebhookUrl,
          slackChannel: data.slackChannel || DEFAULT_SETTINGS.slackChannel,
          queueAutoRetry: data.queueAutoRetry ?? DEFAULT_SETTINGS.queueAutoRetry,
          updatedAt: data.updatedAt ? (typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate().toISOString() : String(data.updatedAt)) : DEFAULT_SETTINGS.updatedAt,
          updatedBy: data.updatedBy || DEFAULT_SETTINGS.updatedBy,
        }
        return { ...cachedSettings }
      }
    }
  } catch (err) {
    console.warn('[AdminNotificationSettings] Firestore fetch failed, using fallback defaults:', err)
  }

  cachedSettings = { ...DEFAULT_SETTINGS }
  return { ...cachedSettings }
}

export async function updateAdminNotificationSettings(
  partialSettings: Partial<AdminNotificationSettings>,
  updatedBy = 'admin'
): Promise<AdminNotificationSettings> {
  const current = await getAdminNotificationSettings()
  const updated: AdminNotificationSettings = {
    ...current,
    ...partialSettings,
    updatedAt: new Date().toISOString(),
    updatedBy,
  }

  cachedSettings = { ...updated }

  if (process.env.NODE_ENV !== 'test') {
    try {
      if (db) {
        const docRef = doc(db, 'admin_settings', 'slack_notifications')
        await setDoc(docRef, {
          ...updated,
          updatedAt: serverTimestamp(),
        }, { merge: true })
      }
    } catch (err) {
      console.error('[AdminNotificationSettings] Failed to persist settings to Firestore:', err)
    }
  }

  return { ...updated }
}

export function resetSettingsCache(): void {
  cachedSettings = null
}
