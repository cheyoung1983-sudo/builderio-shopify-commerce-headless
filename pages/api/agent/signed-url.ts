import type { NextApiRequest, NextApiResponse } from 'next';

interface SignedUrlResponse {
  signedUrl?: string;
  authenticated?: boolean;
  agentId?: string;
  error?: string;
  message?: string;
}

const ALLOWED_ORIGINS = [
  'https://displaycellpros.com',
  'https://www.displaycellpros.com',
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SignedUrlResponse>
) {
  const origin = req.headers.origin;
  if (
    origin &&
    (ALLOWED_ORIGINS.includes(origin) ||
      origin.endsWith('.run.app') ||
      origin.includes('localhost'))
  ) {
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

  const agentId =
    typeof requestedAgentId === 'string'
      ? requestedAgentId.trim()
      : 'agent_3101m30qaxc1f3981zq05pp86ax1';

  const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();

  // ElevenLabs signed URL requires a valid secret API key starting with 'sk_'
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
        message: errText,
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
      message: err.message,
    });
  }
}
