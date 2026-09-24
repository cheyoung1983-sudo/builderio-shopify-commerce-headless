# API Security Utilities (`lib/api-security`)

This module provides essential security middleware and input validation helper functions for Next.js API routes across the application.

---

## Functions & Usage

### 1. `isAllowedOrigin(origin, options)`
Validates whether a given `Origin` request header is permitted based on explicit allowed origins, local development rules (`allowLocalhost`), and preview environments (`allowRunApp`).

**Parameters:**
- `origin`: `string | undefined` - The `Origin` header from incoming HTTP request.
- `options`: `AllowedOriginsOptions`
  - `allowedOrigins`: `string[]` - Explicitly whitelisted origin URLs.
  - `allowLocalhost?: boolean` - If `true`, allows `http://localhost:3000` and `http://127.0.0.1:3000`.
  - `allowRunApp?: boolean` - If `true`, allows subdomains matching `*.run.app`.

---

### 2. `applyCors(res, origin, options)`
Applies CORS response headers (`Access-Control-Allow-Origin` and `Vary: Origin`) to the Next.js response object if the origin passes `isAllowedOrigin` check.

**Parameters:**
- `res`: `NextApiResponse` - Next.js API response object.
- `origin`: `string | undefined` - The incoming request origin.
- `options`: `AllowedOriginsOptions` - Allowed origin configuration.

---

### 3. `handleOptions(req, res, options)`
Handles HTTP `OPTIONS` preflight requests. Returns `true` if the request was an `OPTIONS` preflight (and responds with 204 or 403 accordingly), or `false` if the request is non-OPTIONS.

**Parameters:**
- `req`: `NextApiRequest`
- `res`: `NextApiResponse`
- `options`: `AllowedOriginsOptions`

**Example:**
```ts
if (handleOptions(req, res, corsOptions)) return;
```

---

### 4. `readBoundedString(value, options)`
Safely extracts and validates a string parameter against length bounds. Sanitizes against unexpected non-string inputs.

**Parameters:**
- `value`: `unknown` - Value to inspect.
- `options`:
  - `maxLength`: `number` - Maximum allowed string length.
  - `truncate?: boolean` - Truncate if exceeding `maxLength` (default `true`). If set to `false`, returns `undefined` when exceeded.

---

### 5. `readBoundedInteger(value, options)`
Parses and bounds an integer within specified `min` and `max` constraints.

**Parameters:**
- `value`: `unknown`
- `options`: `{ min: number; max: number }`

---

### 6. `createRateLimiter(options)`
Creates an in-memory sliding window rate limiter instance.

**Parameters:**
- `options`: `{ windowMs: number; maxRequests: number }`

**Returns:**
An object with a `.check(key: string)` method returning `{ allowed: boolean, retryAfterSeconds: number }`.

**Example:**
```ts
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 100 });
const result = rateLimiter.check(clientIp);

if (!result.allowed) {
  return res.status(429).json({ error: 'Too Many Requests', retryAfter: result.retryAfterSeconds });
}
```

---

### 7. `createRequestTracker(config)`
Provides OpenTelemetry request duration, status code, method, path, and metadata tracking with support for OTLP export (e.g. to Honeycomb, Datadog, or custom metrics collectors).

**Parameters:**
- `config`: `OpenTelemetryConfig`
  - `serviceName?: string` - Name of the service (defaults to `OTEL_SERVICE_NAME` or `'api-security'`).
  - `endpointUrl?: string` - Optional OTLP HTTP endpoint URL (defaults to `OTEL_EXPORTER_OTLP_ENDPOINT`).
  - `headers?: Record<string, string>` - Optional HTTP headers for OTLP export (e.g., API keys).
  - `onExport?: (event: TelemetryMetricEvent) => void` - Optional callback for custom metric event processing.

**Example:**
```ts
const tracker = createRequestTracker({
  serviceName: 'checkout-api',
  onExport: (event) => console.log('Metric recorded:', event),
});

export default function handler(req, res) {
  const recordMetrics = tracker.trackRequest(req, res);
  
  // Handle request...
  
  recordMetrics(); // Records duration, status code, and exports telemetry
}
```

---

### 8. `createSecurityAlertNotifier(config)`
Automated security event aggregation and threshold notifier. Triggers alerts via Slack webhooks, email endpoints, or custom callbacks when events like rate-limiting violations (`RATE_LIMIT_EXCEEDED`), CORS errors (`CORS_VIOLATION`), or unauthorized access (`UNAUTHORIZED_ACCESS`) exceed configurable frequency thresholds. Supports custom per-event rules and dynamic runtime configuration updates.

**Parameters:**
- `config`: `SecurityAlertConfig`
  - `thresholdCount?: number` - Default number of occurrences within `windowMs` to trigger an alert (default `5`).
  - `windowMs?: number` - Default evaluation window in milliseconds (default `60000`).
  - `cooldownMs?: number` - Default alert suppression duration in milliseconds (default `300000`).
  - `eventTypeRules?: Record<string, EventTypeRule>` - Specific overrides per event type (e.g. stricter thresholds for `UNAUTHORIZED_ACCESS`).
  - `slackWebhookUrl?: string` - Incoming Slack Webhook URL (defaults to `SECURITY_SLACK_WEBHOOK_URL`).
  - `emailEndpointUrl?: string` - Email dispatch endpoint URL (defaults to `SECURITY_EMAIL_ENDPOINT_URL`).
  - `onAlert?: (alert: SecurityAlert) => void` - Custom alert handler callback.

**Methods:**
- `recordEvent(event: SecurityEvent): SecurityAlert | null` - Records a security event and checks against active thresholds.
- `updateConfig(newConfig: Partial<SecurityAlertConfig>): SecurityAlertConfig` - Dynamically updates threshold rules at runtime without losing history.
- `getConfig(): SecurityAlertConfig` - Retrieves active configuration.
- `getThresholdForType(type: string)` - Returns effective threshold rules for a specific event type.

**Example:**
```ts
const notifier = createSecurityAlertNotifier({
  thresholdCount: 10, // Global default
  eventTypeRules: {
    UNAUTHORIZED_ACCESS: { thresholdCount: 2, windowMs: 30_000 }, // Strict rule
    RATE_LIMIT_EXCEEDED: { thresholdCount: 5, cooldownMs: 120_000 },
  },
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
});

// Dynamically update threshold rule at runtime
notifier.updateConfig({
  eventTypeRules: {
    CORS_VIOLATION: { thresholdCount: 3 },
  },
});

// Record security event
notifier.recordEvent({
  type: 'UNAUTHORIZED_ACCESS',
  key: 'ip:192.168.1.1',
  details: { endpoint: '/api/admin/config' },
});
```

---

## Testing

Unit tests for this module are located in `lib/api-security/__tests__/api-security.test.js`. Run tests using Jest:

```bash
npx jest lib/api-security/__tests__/api-security.test.js
```
