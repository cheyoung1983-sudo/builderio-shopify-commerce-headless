import type { NextApiRequest, NextApiResponse } from 'next';
import {
  acquireElevenLabsTokenWithBackoff,
  ElevenLabsTokenError,
} from '@lib/elevenlabs-token';
import {
  applyCors,
  createRateLimiter,
  handleOptions,
  readBoundedString,
} from '../../lib/api-security/index';

interface TokenResponse {
  token?: string;
  conversation_id?: string;
  agentId?: string;
  iceServers?: Array<{ urls: string | string[] }>;
  error?: string;
  details?: string | Record<string, unknown>;
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenResponse>
) {
  const corsOptions = {
    allowedOrigins,
    allowLocalhost: process.env.NODE_ENV !== 'production',
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

  if (
    req.headers.origin &&
    !corsOptions.allowedOrigins.includes(req.headers.origin) &&
    !(corsOptions.allowLocalhost && req.headers.origin.startsWith('http://localhost:'))
  ) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestedAgentId =
    (req.body && req.body.agentId) ||
    req.query.agentId ||
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ||
    'agent_3101m30qaxc1f3981zq05pp86ax1';

  const agentId = typeof requestedAgentId === 'string' 
    ? readBoundedString(requestedAgentId.trim(), { maxLength: 100 }) || 'agent_3101m30qaxc1f3981zq05pp86ax1'
    : 'agent_3101m30qaxc1f3981zq05pp86ax1';

  try {
    const result = await acquireElevenLabsTokenWithBackoff({
      agentId,
      apiKey: process.env.ELEVENLABS_API_KEY,
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
      const { status } = error.details;
      return res.status(status).json({
        error: `ElevenLabs API error: ${status}`,
      });
    }

    const err = error as Error;
    console.error('[ElevenLabsTokenAPI] Unexpected server error acquiring token:', err);
    return res.status(500).json({
      error: 'Failed to fetch conversation token from voice platform',
    });
  }
}
