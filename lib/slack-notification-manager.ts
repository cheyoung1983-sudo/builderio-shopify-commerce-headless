import { getAdminNotificationSettings } from './admin-notification-settings'

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying'
export type JobType = 'recurring_task_failure' | 'security_alert' | 'tribal_review' | 'system_alert'

export interface NotificationPayload {
  text: string
  channel?: string
  blocks?: unknown[]
  webhookUrl?: string
  [key: string]: unknown
}

export interface NotificationJob {
  id: string
  type: JobType
  title: string
  payload: NotificationPayload
  status: JobStatus
  retryCount: number
  maxRetries: number
  lastError?: string
  createdAt: string
  updatedAt: string
  nextRetryAt?: string
}

export interface SlackQueueMetrics {
  totalPending: number
  activeRetries: number
  failureRate: number
  recentFailures: number
  totalCompleted: number
  totalProcessed: number
  isPaused: boolean
}

export class SlackNotificationManager {
  private static instance: SlackNotificationManager
  private queue: Map<string, NotificationJob> = new Map()
  private isPaused = false

  private constructor() {}

  public static getInstance(): SlackNotificationManager {
    if (!SlackNotificationManager.instance) {
      SlackNotificationManager.instance = new SlackNotificationManager()
    }
    return SlackNotificationManager.instance
  }

  public enqueueJob(
    type: JobType,
    title: string,
    payload: NotificationPayload,
    maxRetries = 5
  ): NotificationJob {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()

    const job: NotificationJob = {
      id,
      type,
      title,
      payload,
      status: 'pending',
      retryCount: 0,
      maxRetries,
      createdAt: now,
      updatedAt: now,
    }

    this.queue.set(id, job)
    this.processQueue().catch((err) =>
      console.error('[SlackNotificationManager] Queue processing error:', err)
    )

    return job
  }

  public async handleTaskFailure(params: {
    taskId: string
    taskName: string
    attemptCount: number
    errorReason: string
    metadata?: Record<string, unknown>
  }): Promise<NotificationJob | null> {
    const settings = await getAdminNotificationSettings()

    if (!settings.slackAlertOnTaskFailureLimitExceeded) {
      console.log(
        '[SlackNotificationManager] Slack alert disabled for recurring task failure limits.'
      )
      return null
    }

    // Exceeds retry limit if attempt count exceeds threshold (e.g. > 5 retries)
    if (params.attemptCount <= settings.taskFailureRetryThreshold) {
      return null
    }

    const title = `🚨 Recurring Task Failure Exceeded Retry Limit`
    const webhookUrl = settings.slackWebhookUrl

    const text = `🚨 *[CRITICAL TASK ALERT]* Recurring task *${params.taskName}* (${params.taskId}) has failed ${params.attemptCount} times, exceeding the ${settings.taskFailureRetryThreshold}-retry limit.\n*Reason:* ${params.errorReason}\n*Timestamp:* ${new Date().toISOString()}`

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Recurring Task Failure Limit Exceeded',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Task Name:*\n${params.taskName}` },
          { type: 'mrkdwn', text: `*Task ID:*\n\`${params.taskId}\`` },
          { type: 'mrkdwn', text: `*Attempt Count:*\n${params.attemptCount} / ${settings.taskFailureRetryThreshold}` },
          { type: 'mrkdwn', text: `*Timestamp:*\n${new Date().toISOString()}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Failure Reason:*\n\`\`\`${params.errorReason}\`\`\``,
        },
      },
    ]

    return this.enqueueJob(
      'recurring_task_failure',
      title,
      {
        text,
        blocks,
        webhookUrl,
        channel: settings.slackChannel,
        taskId: params.taskId,
        taskName: params.taskName,
        attemptCount: params.attemptCount,
      },
      settings.taskFailureRetryThreshold
    )
  }

  public async processQueue(): Promise<void> {
    if (this.isPaused) return

    const now = Date.now()
    const pendingJobs = Array.from(this.queue.values()).filter((job) => {
      if (job.status === 'pending') return true
      if (job.status === 'retrying') {
        return !job.nextRetryAt || new Date(job.nextRetryAt).getTime() <= now
      }
      return false
    })

    for (const job of pendingJobs) {
      await this.dispatchJob(job)
    }
  }

  private async dispatchJob(job: NotificationJob): Promise<void> {
    job.status = 'processing'
    job.updatedAt = new Date().toISOString()

    const webhookUrl =
      job.payload.webhookUrl ||
      process.env.SLACK_TRIBAL_WEBHOOK_URL ||
      process.env.SECURITY_SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      this.handleJobFailure(
        job,
        'No Slack Webhook URL configured in settings or environment.'
      )
      return
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: job.payload.text,
          blocks: job.payload.blocks,
          channel: job.payload.channel,
        }),
      })

      if (!response.ok) {
        throw new Error(`Slack API returned HTTP status ${response.status}`)
      }

      job.status = 'completed'
      job.lastError = undefined
      job.updatedAt = new Date().toISOString()
    } catch (err: any) {
      this.handleJobFailure(job, err?.message || 'Failed to dispatch Slack notification')
    }
  }

  private handleJobFailure(job: NotificationJob, errorMessage: string): void {
    job.retryCount += 1
    job.lastError = errorMessage
    job.updatedAt = new Date().toISOString()

    if (job.retryCount >= job.maxRetries) {
      job.status = 'failed'
      job.nextRetryAt = undefined
    } else {
      job.status = 'retrying'
      // Exponential backoff delay (1s, 2s, 4s, 8s, 16s...)
      const backoffMs = Math.pow(2, job.retryCount - 1) * 1000
      job.nextRetryAt = new Date(Date.now() + backoffMs).toISOString()
    }
  }

  public getMetrics(): SlackQueueMetrics {
    const jobs = Array.from(this.queue.values())
    const totalPending = jobs.filter(
      (j) => j.status === 'pending' || j.status === 'retrying'
    ).length
    const activeRetries = jobs.filter((j) => j.status === 'retrying').length
    const recentFailures = jobs.filter((j) => j.status === 'failed').length
    const totalCompleted = jobs.filter((j) => j.status === 'completed').length
    const totalProcessed = totalCompleted + recentFailures

    const failureRate =
      totalProcessed > 0
        ? Math.round((recentFailures / totalProcessed) * 10000) / 100
        : 0

    return {
      totalPending,
      activeRetries,
      failureRate,
      recentFailures,
      totalCompleted,
      totalProcessed,
      isPaused: this.isPaused,
    }
  }

  public getJobs(): NotificationJob[] {
    return Array.from(this.queue.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  public retryJob(id: string): boolean {
    const job = this.queue.get(id)
    if (!job) return false

    job.status = 'pending'
    job.lastError = undefined
    job.nextRetryAt = undefined
    job.updatedAt = new Date().toISOString()

    this.processQueue().catch((err) =>
      console.error('[SlackNotificationManager] Retry error:', err)
    )

    return true
  }

  public clearFailedJobs(): number {
    let clearedCount = 0
    for (const [id, job] of this.queue.entries()) {
      if (job.status === 'failed') {
        this.queue.delete(id)
        clearedCount++
      }
    }
    return clearedCount
  }

  public pauseQueue(): void {
    this.isPaused = true
  }

  public resumeQueue(): void {
    this.isPaused = false
    this.processQueue().catch((err) =>
      console.error('[SlackNotificationManager] Resume error:', err)
    )
  }

  public resetQueue(): void {
    this.queue.clear()
    this.isPaused = false
  }
}

export const slackNotificationManager = SlackNotificationManager.getInstance()
