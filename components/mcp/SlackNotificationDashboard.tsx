'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bell,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Pause,
  Play,
  Trash2,
  ShieldAlert,
  Save,
  Check,
  Send,
  Loader2,
  Sliders,
} from 'lucide-react'
import type { NotificationJob, SlackQueueMetrics } from '../../lib/slack-notification-manager'
import type { AdminNotificationSettings } from '../../lib/admin-notification-settings'

export default function SlackNotificationDashboard() {
  const [metrics, setMetrics] = useState<SlackQueueMetrics | null>(null)
  const [jobs, setJobs] = useState<NotificationJob[]>([])
  const [settings, setSettings] = useState<AdminNotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [simulatingFailure, setSimulatingFailure] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // Form states
  const [slackAlertToggle, setSlackAlertToggle] = useState(true)
  const [retryThreshold, setRetryThreshold] = useState(5)
  const [webhookUrl, setWebhookUrl] = useState('')

  const fetchQueueData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    try {
      const res = await fetch('/api/admin/slack-notifications/queue')
      if (res.ok) {
        const data = await res.json()
        setMetrics(data.metrics)
        setJobs(data.jobs || [])
        setLastUpdated(new Date().toLocaleTimeString())
      }
    } catch (err) {
      console.error('Failed to fetch Slack queue data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/slack-notifications/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.settings) {
          setSettings(data.settings)
          setSlackAlertToggle(data.settings.slackAlertOnTaskFailureLimitExceeded)
          setRetryThreshold(data.settings.taskFailureRetryThreshold || 5)
          setWebhookUrl(data.settings.slackWebhookUrl || '')
        }
      }
    } catch (err) {
      console.error('Failed to fetch notification settings:', err)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const initializeData = async () => {
      if (isMounted) {
        await Promise.all([fetchQueueData(), fetchSettings()])
      }
    }

    initializeData()

    // Real-time polling every 3 seconds
    const interval = setInterval(() => {
      if (isMounted) {
        fetchQueueData()
      }
    }, 3000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [fetchQueueData, fetchSettings])

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/admin/slack-notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slackAlertOnTaskFailureLimitExceeded: slackAlertToggle,
          taskFailureRetryThreshold: Number(retryThreshold),
          slackWebhookUrl: webhookUrl,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings)
        setSettingsSaved(true)
        setTimeout(() => setSettingsSaved(false), 3000)
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
    } finally {
      setSavingSettings(false)
    }
  }

  const handleQueueAction = async (
    action: 'retry' | 'clear_failed' | 'pause_queue' | 'resume_queue',
    jobId?: string
  ) => {
    try {
      await fetch('/api/admin/slack-notifications/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, jobId }),
      })
      fetchQueueData(true)
    } catch (err) {
      console.error(`Failed queue action ${action}:`, err)
    }
  }

  const handleSimulateTaskFailure = async () => {
    setSimulatingFailure(true)
    try {
      await fetch('/api/admin/slack-notifications/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate_task_failure',
          taskId: `cron_${Math.floor(Math.random() * 9000 + 1000)}`,
          taskName: 'OrderReconciliationSync',
          attemptCount: 6, // >5 retries
          errorReason: 'Shopify Storefront API rate limit exceeded (HTTP 429)',
        }),
      })
      await fetchQueueData(true)
    } catch (err) {
      console.error('Failed to simulate task failure:', err)
    } finally {
      setSimulatingFailure(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-neutral-200 p-8 shadow-xs">
        <Loader2 className="animate-spin text-purple-600 w-8 h-8 mb-4" />
        <p className="text-neutral-600 font-medium">Synchronizing Slack notification queue state...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-neutral-900">Slack Notification Queue</h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-tight ${
                metrics?.isPaused
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {metrics?.isPaused ? 'Queue Paused' : 'Live Sync Active'}
            </span>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Real-time monitoring of Slack alert dispatches, active retry loops, and recurring task failure thresholds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 font-mono">
            Last sync: {lastUpdated || 'Just now'}
          </span>
          <button
            onClick={() => fetchQueueData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 text-xs font-semibold hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pending */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-neutral-500 tracking-wider">
              Total Pending
            </span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900">
              {metrics?.totalPending ?? 0}
            </span>
            <span className="text-xs text-neutral-500 font-medium">in queue</span>
          </div>
        </div>

        {/* Active Retries */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-neutral-500 tracking-wider">
              Active Retries
            </span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900">
              {metrics?.activeRetries ?? 0}
            </span>
            <span className="text-xs text-amber-600 font-medium">retrying</span>
          </div>
        </div>

        {/* Failure Rate */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-neutral-500 tracking-wider">
              Failure Rate
            </span>
            <div
              className={`p-2 rounded-xl ${
                (metrics?.failureRate ?? 0) > 15
                  ? 'bg-red-50 text-red-600'
                  : (metrics?.failureRate ?? 0) > 5
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900">
              {metrics?.failureRate ?? 0}%
            </span>
            <span className="text-xs text-neutral-500 font-medium">
              ({metrics?.recentFailures ?? 0} failed)
            </span>
          </div>
        </div>

        {/* Completed Dispatches */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-neutral-500 tracking-wider">
              Completed
            </span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900">
              {metrics?.totalCompleted ?? 0}
            </span>
            <span className="text-xs text-emerald-600 font-medium">dispatched</span>
          </div>
        </div>
      </div>

      {/* Admin Settings & Controls Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notification Settings Toggle Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-neutral-900 text-lg">
                Task Failure Alert Settings
              </h3>
            </div>
            {settingsSaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-medium">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
              <div>
                <label htmlFor="slack-alert-toggle" className="font-semibold text-neutral-900 text-sm block cursor-pointer">
                  Slack Alert on Task Failure Limit Exceeded
                </label>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Automatically send a Slack notification when a recurring background task fails more than 5 times.
                </p>
              </div>
              <button
                id="slack-alert-toggle"
                role="switch"
                aria-checked={slackAlertToggle}
                onClick={() => setSlackAlertToggle(!slackAlertToggle)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  slackAlertToggle ? 'bg-purple-600' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    slackAlertToggle ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Threshold & Webhook Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-tight mb-1">
                  Retry Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={retryThreshold}
                  onChange={(e) => setRetryThreshold(Number(e.target.value))}
                  className="w-full text-sm p-2.5 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-neutral-500 mt-1">Trigger alert when attempts exceed this limit</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-tight mb-1">
                  Slack Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-lg border border-neutral-300 font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {savingSettings ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Notification Settings
              </button>
            </div>
          </div>
        </div>

        {/* Queue Quick Actions Card */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="font-bold text-neutral-900 text-lg">Queue Controls</h3>
            <p className="text-xs text-neutral-500">Manage queue state & test alert dispatching</p>
          </div>

          <div className="space-y-3 pt-1">
            {metrics?.isPaused ? (
              <button
                onClick={() => handleQueueAction('resume_queue')}
                className="w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4" /> Resume Queue Processing
              </button>
            ) : (
              <button
                onClick={() => handleQueueAction('pause_queue')}
                className="w-full flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
              >
                <Pause className="w-4 h-4" /> Pause Queue Processing
              </button>
            )}

            <button
              onClick={() => handleQueueAction('clear_failed')}
              className="w-full flex items-center justify-center gap-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-neutral-500" /> Clear Failed Items
            </button>

            <button
              onClick={handleSimulateTaskFailure}
              disabled={simulatingFailure}
              className="w-full flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {simulatingFailure ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Trigger Test Task Failure (&gt;5 Retries)
            </button>
          </div>
        </div>
      </div>

      {/* Queue Items Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-neutral-900 text-lg">Active Notification Jobs</h3>
            <p className="text-xs text-neutral-500">Live queue items and dispatch attempts</p>
          </div>
          <span className="text-xs bg-neutral-100 text-neutral-700 font-semibold px-3 py-1 rounded-full">
            {jobs.length} total items
          </span>
        </div>

        {jobs.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-600 font-medium">Notification queue is currently empty</p>
            <p className="text-xs text-neutral-400 mt-1">
              Trigger a test task failure above to populate the queue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-[11px] font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                  <th className="py-3 px-4">Job ID & Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Retry Count</th>
                  <th className="py-3 px-4">Error / Payload</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-xs font-bold text-neutral-800">{job.id}</p>
                      <p className="text-xs text-purple-700 font-medium capitalize mt-0.5">
                        {job.type.replace(/_/g, ' ')}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                          job.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : job.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : job.status === 'retrying'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {job.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {job.status === 'failed' && <ShieldAlert className="w-3.5 h-3.5" />}
                        {job.status === 'retrying' && <RotateCcw className="w-3.5 h-3.5" />}
                        {job.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                        {job.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-neutral-700">
                      <span className="font-bold">{job.retryCount}</span> / {job.maxRetries}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      {job.lastError ? (
                        <p className="text-xs text-red-600 font-mono truncate" title={job.lastError}>
                          {job.lastError}
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-600 truncate" title={job.title}>
                          {job.title}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-neutral-500 font-mono">
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {(job.status === 'failed' || job.status === 'retrying') && (
                        <button
                          onClick={() => handleQueueAction('retry', job.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
