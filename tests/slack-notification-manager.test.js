/**
 * @jest-environment node
 */

const {
  SlackNotificationManager,
  slackNotificationManager,
} = require('../lib/slack-notification-manager')

const {
  getAdminNotificationSettings,
  updateAdminNotificationSettings,
  resetSettingsCache,
} = require('../lib/admin-notification-settings')

describe('SlackNotificationManager & Admin Notification Settings', () => {
  beforeEach(() => {
    slackNotificationManager.resetQueue()
    resetSettingsCache()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('getInstance returns a singleton instance', () => {
    const instance1 = SlackNotificationManager.getInstance()
    const instance2 = SlackNotificationManager.getInstance()
    expect(instance1).toBe(instance2)
    expect(instance1).toBe(slackNotificationManager)
  })

  test('enqueues a job and calculates metrics correctly', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true })

    const job = slackNotificationManager.enqueueJob('system_alert', 'Test Title', {
      text: 'Hello Slack Test',
      webhookUrl: 'https://hooks.slack.com/services/test/mock',
    })

    expect(job).toBeDefined()
    expect(job.title).toBe('Test Title')
    expect(job.type).toBe('system_alert')

    // Wait for async queue processing
    await new Promise((resolve) => setTimeout(resolve, 50))

    const metrics = slackNotificationManager.getMetrics()
    expect(metrics.totalCompleted).toBe(1)
    expect(metrics.totalPending).toBe(0)
    expect(metrics.failureRate).toBe(0)
  })

  test('increments retryCount on dispatch failure and transitions to retrying then failed', async () => {
    global.fetch.mockRejectedValue(new Error('Network connection timeout'))

    const job = slackNotificationManager.enqueueJob(
      'system_alert',
      'Failing Job',
      {
        text: 'This will fail',
        webhookUrl: 'https://hooks.slack.com/services/test/fail',
      },
      2 // maxRetries = 2
    )

    await new Promise((resolve) => setTimeout(resolve, 50))

    // First attempt failed -> retrying state
    expect(job.retryCount).toBe(1)
    expect(job.status).toBe('retrying')
    expect(job.lastError).toContain('Network connection timeout')

    // Retry manually to trigger second attempt
    slackNotificationManager.retryJob(job.id)
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Second attempt failed -> failed state (since maxRetries = 2)
    expect(job.retryCount).toBe(2)
    expect(job.status).toBe('failed')

    const metrics = slackNotificationManager.getMetrics()
    expect(metrics.recentFailures).toBe(1)
    expect(metrics.failureRate).toBe(100)
  })

  test('handleTaskFailure enqueues alert when attempt count exceeds retry threshold', async () => {
    global.fetch.mockResolvedValue({ ok: true })

    // Default threshold is 5 retries. Attempt count 3 should not trigger alert.
    const noAlertJob = await slackNotificationManager.handleTaskFailure({
      taskId: 'task_001',
      taskName: 'SyncInventoryCron',
      attemptCount: 3,
      errorReason: 'Transient timeout',
    })
    expect(noAlertJob).toBeNull()

    // Attempt count 6 (> 5 retries limit) should enqueue a critical alert job
    const alertJob = await slackNotificationManager.handleTaskFailure({
      taskId: 'task_002',
      taskName: 'SyncInventoryCron',
      attemptCount: 6,
      errorReason: 'Shopify Storefront API Rate Limit Exceeded',
    })

    expect(alertJob).not.toBeNull()
    expect(alertJob.type).toBe('recurring_task_failure')
    expect(alertJob.payload.taskId).toBe('task_002')
    expect(alertJob.payload.attemptCount).toBe(6)
  })

  test('handleTaskFailure respects slackAlertOnTaskFailureLimitExceeded setting toggle', async () => {
    global.fetch.mockResolvedValue({ ok: true })

    // Disable the notification toggle in settings
    await updateAdminNotificationSettings({
      slackAlertOnTaskFailureLimitExceeded: false,
    })

    const result = await slackNotificationManager.handleTaskFailure({
      taskId: 'task_003',
      taskName: 'NightlyBackupJob',
      attemptCount: 10, // Exceeds threshold but toggle is OFF
      errorReason: 'Database locked',
    })

    expect(result).toBeNull()

    // Re-enable toggle
    await updateAdminNotificationSettings({
      slackAlertOnTaskFailureLimitExceeded: true,
    })

    const enabledResult = await slackNotificationManager.handleTaskFailure({
      taskId: 'task_004',
      taskName: 'NightlyBackupJob',
      attemptCount: 10,
      errorReason: 'Database locked',
    })

    expect(enabledResult).not.toBeNull()
    expect(enabledResult.type).toBe('recurring_task_failure')
  })

  test('queue actions: pause, resume, clearFailedJobs', async () => {
    slackNotificationManager.pauseQueue()
    expect(slackNotificationManager.getMetrics().isPaused).toBe(true)

    slackNotificationManager.resumeQueue()
    expect(slackNotificationManager.getMetrics().isPaused).toBe(false)

    // Enqueue a failing job to test clearFailedJobs
    global.fetch.mockRejectedValue(new Error('Persistent error'))
    const failingJob = slackNotificationManager.enqueueJob(
      'system_alert',
      'Clear Test Job',
      { text: 'test', webhookUrl: 'https://hooks.slack.com/mock' },
      1 // maxRetries = 1
    )

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(failingJob.status).toBe('failed')

    const clearedCount = slackNotificationManager.clearFailedJobs()
    expect(clearedCount).toBe(1)
    expect(slackNotificationManager.getJobs().length).toBe(0)
  })
})
