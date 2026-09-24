import type { NextApiRequest, NextApiResponse } from 'next';
import {
  acquireElevenLabsTokenWithBackoff,
  ElevenLabsTokenError,
} from '../../../lib/elevenlabs-token.ts';
import {
  applyCors,
  createRateLimiter,
  handleOptions,
  isAllowedOrigin,
  readBoundedString,
} from '../../../lib/api-security/index.ts';

interface TokenResponse {
  token?: string;
  conversation_id?: string;
  agentId?: string;
  iceServers?: Array<{ urls: string | string[] }>;
  error?: string;
  details?: string | Record<string, unknown>;
  category?: string;
}

const allowedOrigins = [
  'https://displaycellpros.com',
  'https://www.displaycellpros.com',
];

const rateLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60_000 });

function getClientKey(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return address?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

function sanitizeErrorMessage(msg?: string): string {
  if (!msg) return 'Voice platform service error';
  return msg
    .replace(/sk_[a-zA-Z0-9_-]+/g, '[REDACTED_KEY]')
    .replace(/key\s*[:=]\s*['"]?[a-zA-Z0-9_-]+['"]?/gi, 'key: [REDACTED_KEY]')
    .replace(/xi-api-key/gi, '[REDACTED_HEADER]');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenResponse>
) {
  const corsOptions = {
    allowedOrigins,
    allowLocalhost: true,
    allowRunApp: true,
  };

  applyCors(res, req.headers.origin, corsOptions);

  if (handleOptions(req, res, corsOptions)) {
    return;
  }

  if (!rateLimiter.check(getClientKey(req)).allowed) {
    const result = rateLimiter.check(getClientKey(req));
    res.setHeader('Retry-After', String(result.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many requests' });
  }

  if (req.headers.origin && !isAllowedOrigin(req.headers.origin, corsOptions)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Security Check: Prohibit client requests from providing ElevenLabs API key in request headers
  const clientKeyHeader =
    (typeof req.headers['xi-api-key'] === 'string' && req.headers['xi-api-key'].trim()) ||
    (typeof req.headers['x-api-key'] === 'string' && req.headers['x-api-key'].trim());

  if (clientKeyHeader) {
    return res.status(400).json({
      error: 'Security violation: ElevenLabs API key must not be passed in client request headers. Handle API keys securely on the server-side only.',
    });
  }

  // Security Check: Prohibit client requests from providing API key in request body
  if (req.body && typeof req.body === 'object' && ('apiKey' in req.body || 'xi-api-key' in req.body || 'x-api-key' in req.body)) {
    return res.status(400).json({
      error: 'Security violation: ElevenLabs API key must not be passed in client request body. Handle API keys securely on the server-side only.',
    });
  }

  // Retrieve API Key: Exclusively from server-side environment variables
  const rawApiKey = (process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY || '').trim();
  const apiKey = rawApiKey.length > 0 ? rawApiKey : undefined;

  // Retrieve Agent ID: Check headers, body, query, or environment variables
  const headerAgentId = typeof req.headers['x-agent-id'] === 'string' ? req.headers['x-agent-id'] : undefined;
  const requestedAgentId =
    headerAgentId ||
    (req.body && req.body.agentId) ||
    req.query.agentId ||
    process.env.ELEVENLABS_AGENT_ID ||
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ||
    'agent_3101m30qaxc1f3981zq05pp86ax1';

  const agentId =
    typeof requestedAgentId === 'string'
      ? readBoundedString(requestedAgentId.trim(), { maxLength: 100 }) || 'agent_3101m30qaxc1f3981zq05pp86ax1'
      : 'agent_3101m30qaxc1f3981zq05pp86ax1';

  try {
    const result = await acquireElevenLabsTokenWithBackoff({
      agentId,
      apiKey,
      maxRetries: 3,
      initialDelayMs: 500,
      maxDelayMs: 3000,
      backoffFactor: 2,
    });

    return res.status(200).json({
      token: result.token,
      conversation_id: result.conversationId,
      agentId,
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
      ],
    });
  } catch (error) {
    if (error instanceof ElevenLabsTokenError) {
      const { status, responseBody, category, isRetryable, agentId: errAgentId } = error.details;
      console.error(`[ElevenLabsTokenAPI:Error] Failed acquiring signed URL token from ElevenLabs API:`, {
        status,
        category,
        isRetryable,
        agentId: errAgentId,
        responseBody,
        message: error.message,
      });
      return res.status(status).json({
        error: `ElevenLabs API error: ${status}`,
        details: sanitizeErrorMessage(error.message),
        category,
        agentId: errAgentId,
      });
    }

    const err = error as Error;
    console.error('[ElevenLabsTokenAPI] Unexpected server error acquiring token:', err);
    return res.status(500).json({
      error: 'Failed to fetch conversation token from voice platform',
      details: 'An unexpected internal error occurred while acquiring voice token',
    });
  }
}
