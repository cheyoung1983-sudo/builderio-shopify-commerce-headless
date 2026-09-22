import type { NextApiRequest, NextApiResponse } from 'next';
import {
  acquireElevenLabsTokenWithBackoff,
  ElevenLabsTokenError,
} from '@lib/elevenlabs-token';

interface TokenResponse {
  token?: string;
  conversation_id?: string;
  agentId?: string;
  iceServers?: Array<{ urls: string | string[] }>;
  error?: string;
  details?: string | Record<string, unknown>;
}

const ALLOWED_ORIGINS = [
  'https://displaycellpros.com',
  'https://www.displaycellpros.com',
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenResponse>
) {
  // CORS Configuration
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.run.app') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://displaycellpros.com');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestedAgentId =
    (req.body && req.body.agentId) ||
    req.query.agentId ||
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ||
    'agent_3101m30qaxc1f3981zq05pp86ax1';

  const agentId = typeof requestedAgentId === 'string' ? requestedAgentId.trim() : 'agent_3101m30qaxc1f3981zq05pp86ax1';

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
      const { status, statusText, responseBody, parsedBody } = error.details;
      return res.status(status).json({
        error: `ElevenLabs API error: ${status} ${statusText}`,
        details: parsedBody || responseBody || error.message,
      });
    }

    const err = error as Error;
    console.error('[ElevenLabsTokenAPI] Unexpected server error acquiring token:', err);
    return res.status(500).json({
      error: 'Failed to fetch conversation token from voice platform',
      details: err.message,
    });
  }
}
