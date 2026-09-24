import type { NextApiRequest, NextApiResponse } from 'next';
import {
  constructEvent,
  ElevenLabsWebhookEvent,
} from '@lib/elevenlabs-webhook';

export const config = {
  api: {
    bodyParser: false,
  },
};

// In-memory set for event idempotency (capped at 10,000 entries)
const processedEventIds = new Set<string>();
const MAX_PROCESSED_CACHE_SIZE = 10_000;

function markEventProcessed(eventId: string): void {
  if (processedEventIds.size >= MAX_PROCESSED_CACHE_SIZE) {
    const oldestKey = processedEventIds.values().next().value;
    if (oldestKey) {
      processedEventIds.delete(oldestKey);
    }
  }
  processedEventIds.add(eventId);
}

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

interface WebhookResponseBody {
  received: boolean;
  type?: string;
  event_id?: string;
  conversation_id?: string;
  status?: string;
  reason?: string;
  error?: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WebhookResponseBody>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      received: false,
      error: 'Method not allowed. ElevenLabs webhooks require HTTP POST.',
    });
  }

  const webhookSecret =
    process.env.WEBHOOK_SECRET ||
    process.env.ELEVENLABS_WEBHOOK_SECRET ||
    (process.env.NODE_ENV !== 'production' ? 'development_webhook_secret_key' : undefined);

  if (!webhookSecret) {
    console.error('[ElevenLabsWebhook:Error] WEBHOOK_SECRET is not configured in server environment.');
    return res.status(500).json({
      received: false,
      error: 'Server webhook secret configuration missing',
    });
  }

  let rawBody: Buffer;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error('[ElevenLabsWebhook:Error] Failed reading raw body stream:', err);
    return res.status(400).json({
      received: false,
      error: 'Failed reading request body stream',
    });
  }

  const signatureHeader = req.headers['elevenlabs-signature'];

  let event: ElevenLabsWebhookEvent;
  try {
    event = constructEvent(rawBody, signatureHeader, webhookSecret);
  } catch (err) {
    const errorMsg = (err as Error).message || 'Signature verification failed';
    console.warn('[ElevenLabsWebhook:Security] Webhook verification failed:', errorMsg);
    return res.status(401).json({
      received: false,
      error: 'Unauthorized',
      details: errorMsg,
    });
  }

  const eventId =
    event.event_id ||
    event.conversation_id ||
    (event.data && event.data.conversation_id) ||
    `evt_${Date.now()}`;

  const conversationId = event.conversation_id || event.data?.conversation_id;

  // Ensure idempotent event processing
  if (processedEventIds.has(eventId)) {
    console.info(`[ElevenLabsWebhook:Idempotency] Duplicate event skipped: ${eventId}`);
    return res.status(200).json({
      received: true,
      event_id: eventId,
      conversation_id: conversationId,
      status: 'ignored',
      reason: 'duplicate_event',
    });
  }

  markEventProcessed(eventId);

  console.log(`[ElevenLabsWebhook] Received verified event "${event.type}" (ID: ${eventId})`);

  switch (event.type) {
    case 'post_call_transcription': {
      const data = event.data || {};
      const agentId = data.agent_id || event.agent_id;
      const transcript = data.transcript || [];
      const analysis = data.analysis || {};
      const metadata = data.metadata || {};

      console.log('[ElevenLabsWebhook:PostCallTranscription] Processing post call transcript:', {
        eventId,
        conversationId: data.conversation_id || conversationId,
        agentId,
        messageCount: Array.isArray(transcript) ? transcript.length : 0,
        callDurationSecs: metadata.call_duration_secs,
        summary: analysis.transcript_summary || '[NONE]',
        callSuccessful: analysis.call_successful,
      });

      // Handle custom business post-call processing logic here (e.g. store transcript, update repair lead, sync analytics)

      return res.status(200).json({
        received: true,
        type: 'post_call_transcription',
        event_id: eventId,
        conversation_id: data.conversation_id || conversationId,
        status: 'processed',
      });
    }

    default: {
      console.info(`[ElevenLabsWebhook] Unhandled event type "${event.type}" received and acknowledged.`);
      return res.status(200).json({
        received: true,
        type: event.type,
        event_id: eventId,
        status: 'ignored',
        reason: 'unhandled_event_type',
      });
    }
  }
}
