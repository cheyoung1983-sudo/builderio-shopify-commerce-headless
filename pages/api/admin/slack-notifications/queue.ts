import type { NextApiRequest, NextApiResponse } from 'next'
import { slackNotificationManager } from '../../../../lib/slack-notification-manager'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const metrics = slackNotificationManager.getMetrics()
    const jobs = slackNotificationManager.getJobs()
    return res.status(200).json({ metrics, jobs })
  }

  if (req.method === 'POST') {
    const { action, jobId, taskId, taskName, attemptCount, errorReason } = req.body || {}

    switch (action) {
      case 'retry': {
        if (!jobId) {
          return res.status(400).json({ error: 'Missing jobId' })
        }
        const success = slackNotificationManager.retryJob(jobId)
        if (!success) {
          return res.status(404).json({ error: 'Job not found' })
        }
        return res.status(200).json({ message: 'Job retry initiated', success: true })
      }

      case 'clear_failed': {
        const cleared = slackNotificationManager.clearFailedJobs()
        return res.status(200).json({ message: `Cleared ${cleared} failed jobs`, cleared })
      }

      case 'pause_queue': {
        slackNotificationManager.pauseQueue()
        return res.status(200).json({ message: 'Queue paused', isPaused: true })
      }

      case 'resume_queue': {
        slackNotificationManager.resumeQueue()
        return res.status(200).json({ message: 'Queue resumed', isPaused: false })
      }

      case 'simulate_task_failure': {
        const job = await slackNotificationManager.handleTaskFailure({
          taskId: taskId || `task_${Date.now()}`,
          taskName: taskName || 'SyncShopifyInventoryCron',
          attemptCount: Number(attemptCount ?? 6),
          errorReason: errorReason || 'Shopify GraphQL API rate limit exceeded (HTTP 429)',
        })

        return res.status(200).json({
          message: job ? 'Task failure notification enqueued' : 'Notification suppressed by settings or threshold',
          job,
        })
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
}
