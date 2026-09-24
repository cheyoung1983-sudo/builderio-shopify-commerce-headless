const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

function runApiSecurityTest(codeSnippet) {
  const repoRoot = path.resolve(__dirname, '../../..')
  const securityUrl = pathToFileURL(path.join(repoRoot, 'lib/api-security/index.ts')).href

  const script = `
    const security = await import(${JSON.stringify(securityUrl)})
    ${codeSnippet}
  `

  const output = execFileSync(process.execPath, ['--experimental-strip-types', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' },
  })

  return output.trim()
}

describe('API Security Utilities', () => {
  test('isAllowedOrigin handles exact origins, localhost, run.app, and invalid inputs', () => {
    const result = runApiSecurityTest(`
      const opts = { allowedOrigins: ['https://displaycellpros.com'], allowLocalhost: true, allowRunApp: true };
      const r1 = security.isAllowedOrigin('https://displaycellpros.com', opts);
      const r2 = security.isAllowedOrigin('https://attacker.com', opts);
      const r3 = security.isAllowedOrigin('https://displaycellpros.com.attacker.test', opts);
      const r4 = security.isAllowedOrigin('http://localhost:3000', opts);
      const r5 = security.isAllowedOrigin('https://test.run.app', opts);
      const r6 = security.isAllowedOrigin(undefined, opts);
      const r7 = security.isAllowedOrigin('malformed-url', opts);
      console.log(JSON.stringify({ r1, r2, r3, r4, r5, r6, r7 }));
    `)
    const parsed = JSON.parse(result)
    expect(parsed.r1).toBe(true)
    expect(parsed.r2).toBe(false)
    expect(parsed.r3).toBe(false)
    expect(parsed.r4).toBe(true)
    expect(parsed.r5).toBe(true)
    expect(parsed.r6).toBe(false)
    expect(parsed.r7).toBe(false)
  })

  test('applyCors sets headers correctly', () => {
    const result = runApiSecurityTest(`
      const opts = { allowedOrigins: ['https://displaycellpros.com'] };
      const resAllowed = { headers: {}, setHeader(k, v) { this.headers[k] = v; } };
      security.applyCors(resAllowed, 'https://displaycellpros.com', opts);

      const resDisallowed = { headers: {}, setHeader(k, v) { this.headers[k] = v; } };
      security.applyCors(resDisallowed, 'https://attacker.com', opts);

      console.log(JSON.stringify({ allowed: resAllowed.headers, disallowed: resDisallowed.headers }));
    `)
    const parsed = JSON.parse(result)
    expect(parsed.allowed['Access-Control-Allow-Origin']).toBe('https://displaycellpros.com')
    expect(parsed.allowed['Vary']).toBe('Origin')
    expect(parsed.disallowed['Access-Control-Allow-Origin']).toBeUndefined()
  })

  test('handleOptions handles preflight and non-OPTIONS requests', () => {
    const result = runApiSecurityTest(`
      const opts = { allowedOrigins: ['https://displaycellpros.com'] };
      
      const reqOpt = { method: 'OPTIONS', headers: { origin: 'https://displaycellpros.com' } };
      let statusCalled = 0;
      const resOpt = {
        headers: {},
        status(c) { statusCalled = c; return this; },
        setHeader(k, v) { this.headers[k] = v; },
        send() {}
      };
      const handledOpt = security.handleOptions(reqOpt, resOpt, opts);

      const reqGet = { method: 'GET', headers: {} };
      const handledGet = security.handleOptions(reqGet, {}, opts);

      console.log(JSON.stringify({ handledOpt, statusCalled, headers: resOpt.headers, handledGet }));
    `)
    const parsed = JSON.parse(result)
    expect(parsed.handledOpt).toBe(true)
    expect(parsed.statusCalled).toBe(204)
    expect(parsed.headers['Access-Control-Allow-Origin']).toBe('https://displaycellpros.com')
    expect(parsed.handledGet).toBe(false)
  })

  test('readBoundedString bounds strings and handles invalid inputs', () => {
    const result = runApiSecurityTest(`
      const s1 = security.readBoundedString('hello', { maxLength: 10 });
      const s2 = security.readBoundedString('hello world', { maxLength: 5, truncate: true });
      const s3 = security.readBoundedString('hello world', { maxLength: 5, truncate: false });
      const s4 = security.readBoundedString(12345, { maxLength: 10 });
      const s5 = security.readBoundedString(null, { maxLength: 10 });
      console.log(JSON.stringify({ s1, s2, s3, s4, s5 }));
    `)
    const parsed = JSON.parse(result)
    expect(parsed.s1).toBe('hello')
    expect(parsed.s2).toBe('hello')
    expect(parsed.s3).toBeUndefined()
    expect(parsed.s4).toBeUndefined()
    expect(parsed.s5).toBeUndefined()
  })

  test('createRateLimiter enforces rate limits and tracks keys separately', () => {
    const result = runApiSecurityTest(`
      const limiter = security.createRateLimiter({ windowMs: 60000, maxRequests: 2 });
      const a1 = limiter.check('client-a');
      const a2 = limiter.check('client-a');
      const a3 = limiter.check('client-a');
      const b1 = limiter.check('client-b');
      console.log(JSON.stringify({ a1, a2, a3, b1 }));
    `)
    const parsed = JSON.parse(result)
    expect(parsed.a1.allowed).toBe(true)
    expect(parsed.a2.allowed).toBe(true)
    expect(parsed.a3.allowed).toBe(false)
    expect(parsed.a3.retryAfterSeconds).toBeGreaterThan(0)
    expect(parsed.b1.allowed).toBe(true)
  })

  test('createRequestTracker tracks request duration, status codes, and path', () => {
    const result = runApiSecurityTest(`
      let exportedEvent = null;
      const tracker = security.createRequestTracker({
        serviceName: 'test-service',
        onExport: (evt) => { exportedEvent = evt; }
      });

      const req = { method: 'POST', url: '/api/agent/token', headers: { 'user-agent': 'JestTest' } };
      const res = { statusCode: 200 };

      const record = tracker.trackRequest(req, res);
      const event = record();

      console.log(JSON.stringify({ event, exportedEvent }));
    `)
    const parsed = JSON.parse(result)
    expect(parsed.event.method).toBe('POST')
    expect(parsed.event.path).toBe('/api/agent/token')
    expect(parsed.event.statusCode).toBe(200)
    expect(parsed.event.userAgent).toBe('JestTest')
    expect(parsed.event.serviceName).toBe('test-service')
    expect(typeof parsed.event.durationMs).toBe('number')
    expect(parsed.exportedEvent.serviceName).toBe('test-service')
  })

  test('createSecurityAlertNotifier triggers alert when threshold is exceeded and respects cooldown', () => {
    const result = runApiSecurityTest(`
      const alerts = [];
      const notifier = security.createSecurityAlertNotifier({
        thresholdCount: 3,
        windowMs: 60000,
        cooldownMs: 300000,
        onAlert: (alert) => alerts.push(alert)
      });

      const e1 = notifier.recordEvent({ type: 'RATE_LIMIT_EXCEEDED', key: 'ip-1' });
      const e2 = notifier.recordEvent({ type: 'RATE_LIMIT_EXCEEDED', key: 'ip-1' });
      const e3 = notifier.recordEvent({ type: 'RATE_LIMIT_EXCEEDED', key: 'ip-1' }); // triggers threshold!
      const e4 = notifier.recordEvent({ type: 'RATE_LIMIT_EXCEEDED', key: 'ip-1' }); // suppressed by cooldown

      console.log(JSON.stringify({ e1, e2, e3, e4, alertsCount: alerts.length }));
    `)
    const parsed = JSON.parse(result)
    expect(parsed.e1).toBeNull()
    expect(parsed.e2).toBeNull()
    expect(parsed.e3).not.toBeNull()
    expect(parsed.e3.type).toBe('RATE_LIMIT_EXCEEDED')
    expect(parsed.e3.eventCount).toBe(3)
    expect(parsed.e4).toBeNull()
    expect(parsed.alertsCount).toBe(1)
  })

  test('createSecurityAlertNotifier supports per-event-type rules and dynamic updateConfig', () => {
    const result = runApiSecurityTest(`
      const alerts = [];
      const notifier = security.createSecurityAlertNotifier({
        thresholdCount: 10, // default high threshold
        eventTypeRules: {
          UNAUTHORIZED_ACCESS: { thresholdCount: 2, windowMs: 30000 }, // strict rule for unauthorized access
        },
        onAlert: (alert) => alerts.push(alert)
      });

      // 2 unauthorized access events trigger alert based on strict rule
      const u1 = notifier.recordEvent({ type: 'UNAUTHORIZED_ACCESS', key: 'ip-2' });
      const u2 = notifier.recordEvent({ type: 'UNAUTHORIZED_ACCESS', key: 'ip-2' });

      // Dynamic config update
      notifier.updateConfig({
        eventTypeRules: {
          CORS_VIOLATION: { thresholdCount: 1 }
        }
      });

      const c1 = notifier.recordEvent({ type: 'CORS_VIOLATION', key: 'ip-3' });

      console.log(JSON.stringify({ u1, u2, c1, alertsCount: alerts.length }));
    `)
    const parsed = JSON.parse(result)
    expect(parsed.u1).toBeNull()
    expect(parsed.u2).not.toBeNull()
    expect(parsed.u2.type).toBe('UNAUTHORIZED_ACCESS')
    expect(parsed.c1).not.toBeNull()
    expect(parsed.c1.type).toBe('CORS_VIOLATION')
    expect(parsed.alertsCount).toBe(2)
  })
})

