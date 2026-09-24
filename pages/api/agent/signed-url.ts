import type { NextApiRequest, NextApiResponse } from 'next';
import {
  applyCors,
  createRateLimiter,
  handleOptions,
  isAllowedOrigin,
  readBoundedString,
} from '@lib/api-security';

interface SignedUrlResponse {
  signedUrl?: string;
  authenticated?: boolean;
  agentId?: string;
  error?: string;
  message?: string;
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
  res: NextApiResponse<SignedUrlResponse>
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

  if (!isAllowedOrigin(req.headers.origin, corsOptions)) {
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

  const agentId =
    typeof requestedAgentId === 'string'
      ? readBoundedString(requestedAgentId.trim(), { maxLength: 100 }) || 'agent_3101m30qaxc1f3981zq05pp86ax1'
      : 'agent_3101m30qaxc1f3981zq05pp86ax1';

  const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();

  if (!apiKey || !apiKey.startsWith('sk_')) {
    return res.status(200).json({
      authenticated: false,
      agentId,
      message:
        'No valid ElevenLabs secret key (sk_*) found. Public agent access with ephemeral conversation tokens should be used.',
    });
  }

  try {
    const url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(
      agentId
    )}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(
        `[ElevenLabs:SignedUrl] Upstream API returned HTTP ${response.status}: ${errText}`
      );
      return res.status(response.status).json({
        authenticated: false,
        agentId,
        error: `ElevenLabs returned HTTP ${response.status}`,
      });
    }

    const data = await response.json();
    return res.status(200).json({
      signedUrl: data.signed_url,
      authenticated: true,
      agentId,
    });
  } catch (error) {
    const err = error as Error;
    console.error('[ElevenLabs:SignedUrl] Exception fetching signed url:', err);
    return res.status(500).json({
      error: 'Failed to generate signed URL',
    });
  }
}
