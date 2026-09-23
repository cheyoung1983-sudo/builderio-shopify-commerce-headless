export interface AllowedOriginsOptions {
  allowedOrigins: string[];
  allowLocalhost?: boolean;
  allowRunApp?: boolean;
}

export function isAllowedOrigin(origin: string | undefined, options: AllowedOriginsOptions): boolean {
  if (!origin) return false;

  if (options.allowLocalhost) {
    if (origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:3000') return true;
  }

  if (options.allowRunApp) {
    try {
      const url = new URL(origin);
      if (url.hostname.endsWith('.run.app')) return true;
    } catch {
      return false;
    }
  }

  return options.allowedOrigins.includes(origin);
}

export function applyCors(res: any, origin: string | undefined, options: AllowedOriginsOptions): void {
  if (isAllowedOrigin(origin, options)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
}

export function handleOptions(req: any, res: any, options: AllowedOriginsOptions): boolean {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    if (isAllowedOrigin(origin, options)) {
      applyCors(res, origin, options);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
