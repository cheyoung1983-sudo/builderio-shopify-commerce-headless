export interface AllowedOriginsOptions {
  allowedOrigins: string[];
  allowLocalhost?: boolean;
  allowRunApp?: boolean;
}

export function isAllowedOrigin(origin: string | undefined, options: AllowedOriginsOptions = { allowedOrigins: [] }): boolean {
  if (!origin) return false;

  if (options.allowLocalhost !== false) {
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin === 'http://localhost' || origin === 'http://127.0.0.1') {
      return true;
    }
  }

  if (options.allowRunApp !== false) {
    try {
      const url = new URL(origin);
      if (url.hostname.endsWith('.run.app')) return true;
    } catch {
      // Ignore invalid URL formatting
    }
  }

  return Array.isArray(options.allowedOrigins) && options.allowedOrigins.includes(origin);
}

export function applyCors(res: any, origin: string | undefined, options: AllowedOriginsOptions): void {
  if (origin && isAllowedOrigin(origin, options)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
}

export function handleOptions(req: any, res: any, options: AllowedOriginsOptions): boolean {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin, options)) {
      applyCors(res, origin, options);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.status(204).send();
      return true;
    }
    res.status(403).send('Forbidden');
    return true;
  }
  return false;
}

export function readBoundedString(value: any, options: { maxLength: number; truncate?: boolean }): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (value.length > options.maxLength) {
    if (options.truncate === false) return undefined;
    return value.substring(0, options.maxLength);
  }
  return value;
}

export function readBoundedInteger(value: any, options: { min: number; max: number }): number | undefined {
  const num = parseInt(value, 10);
  if (isNaN(num)) return undefined;
  return Math.min(Math.max(num, options.min), options.max);
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function createRateLimiter(options: { windowMs: number; maxRequests: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const record = hits.get(key);

      if (!record || now > record.resetAt) {
        hits.set(key, { count: 1, resetAt: now + options.windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }

      if (record.count >= options.maxRequests) {
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000),
        };
      }

      record.count++;
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

export interface TelemetryMetricEvent {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userAgent?: string;
  timestamp: string;
  serviceName?: string;
}

export interface OpenTelemetryConfig {
  serviceName?: string;
  endpointUrl?: string;
  headers?: Record<string, string>;
  onExport?: (event: TelemetryMetricEvent) => void;
}

export function createRequestTracker(config: OpenTelemetryConfig = {}) {
  const serviceName = config.serviceName || process.env.OTEL_SERVICE_NAME || 'api-security';
  const endpointUrl = config.endpointUrl || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  return {
    trackRequest(req: any, res: any) {
      const startTime = Date.now();
      const method = req.method || 'UNKNOWN';
      const path = req.url || req.path || '/';
      const userAgent = (req.headers && req.headers['user-agent']) || 'unknown';

      return function recordMetrics() {
        const durationMs = Date.now() - startTime;
        const statusCode = res.statusCode || 200;

        const event: TelemetryMetricEvent = {
          serviceName,
          method,
          path,
          statusCode,
          durationMs,
          userAgent,
          timestamp: new Date().toISOString(),
        };

        if (config.onExport) {
          try {
            config.onExport(event);
          } catch (err) {
            console.error('[OpenTelemetry] Export callback failed:', err);
          }
        }

        if (endpointUrl) {
          const payload = {
            resourceMetrics: [
              {
                resource: {
                  attributes: [{ key: 'service.name', value: { stringValue: serviceName } }],
                },
                scopeMetrics: [
                  {
                    scope: { name: 'api-security-http' },
                    metrics: [
                      {
                        name: 'http.server.duration',
                        unit: 'ms',
                        histogram: {
                          dataPoints: [
                            {
                              attributes: [
                                { key: 'http.method', value: { stringValue: method } },
                                { key: 'http.target', value: { stringValue: path } },
                                { key: 'http.status_code', value: { intValue: statusCode } },
                              ],
                              count: 1,
                              sum: durationMs,
                            },
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          };

          fetch(endpointUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(config.headers || {}),
            },
            body: JSON.stringify(payload),
          }).catch((err) => {
            console.error('[OpenTelemetry] Failed to export metric to OTLP endpoint:', err);
          });
        }

        return event;
      };
    },
  };
}

export interface SecurityEvent {
  type: 'RATE_LIMIT_EXCEEDED' | 'CORS_VIOLATION' | 'UNAUTHORIZED_ACCESS' | string;
  key?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export interface EventTypeRule {
  thresholdCount: number;
  windowMs?: number;
  cooldownMs?: number;
}

export interface SecurityAlertConfig {
  thresholdCount?: number;
  windowMs?: number;
  cooldownMs?: number;
  eventTypeRules?: Record<string, EventTypeRule>;
  slackWebhookUrl?: string;
  emailEndpointUrl?: string;
  onAlert?: (alert: SecurityAlert) => void;
}

export interface SecurityAlert {
  type: string;
  eventCount: number;
  windowMs: number;
  firstSeen: string;
  lastSeen: string;
  sampleDetails?: Record<string, unknown>;
}

export function createSecurityAlertNotifier(initialConfig: SecurityAlertConfig = {}) {
  let currentConfig: SecurityAlertConfig = {
    thresholdCount: initialConfig.thresholdCount ?? 5,
    windowMs: initialConfig.windowMs ?? 60_000,
    cooldownMs: initialConfig.cooldownMs ?? 300_000,
    eventTypeRules: initialConfig.eventTypeRules || {},
    slackWebhookUrl: initialConfig.slackWebhookUrl || process.env.SECURITY_SLACK_WEBHOOK_URL,
    emailEndpointUrl: initialConfig.emailEndpointUrl || process.env.SECURITY_EMAIL_ENDPOINT_URL,
    onAlert: initialConfig.onAlert,
  };

  const eventHistory: Map<string, { timestamps: number[]; lastAlertTime: number; lastDetails?: Record<string, unknown> }> = new Map();

  function getThresholdsForType(type: string): { thresholdCount: number; windowMs: number; cooldownMs: number } {
    const defaultThreshold = currentConfig.thresholdCount ?? 5;
    const defaultWindow = currentConfig.windowMs ?? 60_000;
    const defaultCooldown = currentConfig.cooldownMs ?? 300_000;

    const customRule = currentConfig.eventTypeRules?.[type];
    if (customRule) {
      return {
        thresholdCount: customRule.thresholdCount,
        windowMs: customRule.windowMs ?? defaultWindow,
        cooldownMs: customRule.cooldownMs ?? defaultCooldown,
      };
    }

    return {
      thresholdCount: defaultThreshold,
      windowMs: defaultWindow,
      cooldownMs: defaultCooldown,
    };
  }

  async function dispatchNotification(alert: SecurityAlert, effectiveThreshold: number) {
    if (currentConfig.onAlert) {
      try {
        currentConfig.onAlert(alert);
      } catch (err) {
        console.error('[SecurityAlertNotifier] Custom alert callback failed:', err);
      }
    }

    const alertMessage = `🚨 [SECURITY ALERT] ${alert.type}: Exceeded threshold of ${effectiveThreshold} events in ${Math.round(alert.windowMs / 1000)}s window. Total occurrences: ${alert.eventCount}.`;

    const slackUrl = currentConfig.slackWebhookUrl;
    if (slackUrl) {
      fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: alertMessage,
          attachments: [
            {
              color: 'danger',
              fields: [
                { title: 'Event Type', value: alert.type, short: true },
                { title: 'Count', value: String(alert.eventCount), short: true },
                { title: 'First Seen', value: alert.firstSeen, short: false },
                { title: 'Last Seen', value: alert.lastSeen, short: false },
              ],
            },
          ],
        }),
      }).catch((err) => console.error('[SecurityAlertNotifier] Slack dispatch failed:', err));
    }

    const emailUrl = currentConfig.emailEndpointUrl;
    if (emailUrl) {
      fetch(emailUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `Security Alert: ${alert.type}`,
          message: alertMessage,
          alert,
        }),
      }).catch((err) => console.error('[SecurityAlertNotifier] Email dispatch failed:', err));
    }
  }

  return {
    recordEvent(event: SecurityEvent): SecurityAlert | null {
      const now = Date.now();
      const eventKey = `${event.type}:${event.key || 'global'}`;
      let record = eventHistory.get(eventKey);

      if (!record) {
        record = { timestamps: [], lastAlertTime: 0 };
        eventHistory.set(eventKey, record);
      }

      const { thresholdCount, windowMs, cooldownMs } = getThresholdsForType(event.type);

      record.timestamps = record.timestamps.filter((ts) => now - ts <= windowMs);
      record.timestamps.push(now);
      record.lastDetails = event.details;

      const recentCount = record.timestamps.length;
      const isInCooldown = now - record.lastAlertTime < cooldownMs;

      if (recentCount >= thresholdCount && !isInCooldown) {
        record.lastAlertTime = now;

        const alert: SecurityAlert = {
          type: event.type,
          eventCount: recentCount,
          windowMs,
          firstSeen: new Date(record.timestamps[0]).toISOString(),
          lastSeen: new Date(now).toISOString(),
          sampleDetails: record.lastDetails,
        };

        dispatchNotification(alert, thresholdCount);
        return alert;
      }

      return null;
    },

    updateConfig(newConfig: Partial<SecurityAlertConfig>): SecurityAlertConfig {
      currentConfig = {
        ...currentConfig,
        ...newConfig,
        eventTypeRules: {
          ...(currentConfig.eventTypeRules || {}),
          ...(newConfig.eventTypeRules || {}),
        },
      };
      return currentConfig;
    },

    getConfig(): SecurityAlertConfig {
      return { ...currentConfig };
    },

    getThresholdForType(type: string) {
      return getThresholdsForType(type);
    },
  };
}

