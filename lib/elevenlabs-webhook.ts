import crypto from 'crypto';

export interface ElevenLabsTranscriptMessage {
  role: 'user' | 'agent' | string;
  message?: string;
  text?: string;
  time_in_call_secs?: number;
  [key: string]: unknown;
}

export interface PostCallTranscriptionData {
  conversation_id?: string;
  agent_id?: string;
  transcript?: ElevenLabsTranscriptMessage[];
  metadata?: {
    call_duration_secs?: number;
    cost?: number;
    [key: string]: unknown;
  };
  analysis?: {
    transcript_summary?: string;
    call_successful?: string | boolean;
    data_collection_results?: Record<string, unknown>;
    evaluation_criteria_results?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ElevenLabsWebhookEvent {
  type: string;
  event_id?: string;
  conversation_id?: string;
  data?: PostCallTranscriptionData;
  timestamp?: number;
  [key: string]: unknown;
}

/**
 * Verifies and constructs an ElevenLabs Webhook event using the 'elevenlabs-signature' header.
 *
 * ElevenLabs signature header format:
 * t=<timestamp>,v1=<hmac_sha256_signature>
 */
export function constructEvent(
  rawBody: string | Buffer,
  signatureHeader: string | string[] | undefined,
  secret: string,
  toleranceSeconds: number = 300
): ElevenLabsWebhookEvent {
  if (!secret || secret.trim().length === 0) {
    throw new Error('WEBHOOK_SECRET is not configured on the server environment');
  }

  if (!signatureHeader) {
    throw new Error('Missing elevenlabs-signature header in webhook request');
  }

  const headerValue = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

  // Parse key=value pairs from the header
  const signatureParts: Record<string, string> = {};
  for (const item of headerValue.split(',')) {
    const equalIdx = item.indexOf('=');
    if (equalIdx > 0) {
      const key = item.slice(0, equalIdx).trim();
      const val = item.slice(equalIdx + 1).trim();
      signatureParts[key] = val;
    }
  }

  const timestamp = signatureParts['t'];
  const signature = signatureParts['v1'] || signatureParts['s'];

  if (!timestamp || !signature) {
    throw new Error('Invalid elevenlabs-signature header format. Required: t=<timestamp>,v1=<signature>');
  }

  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum)) {
    throw new Error('Invalid timestamp in elevenlabs-signature header');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampNum) > toleranceSeconds) {
    throw new Error(`Webhook timestamp expired or out of tolerance (${timestampNum} vs current ${nowSeconds})`);
  }

  // Compute HMAC SHA256 over `${timestamp}.${rawBody}`
  const signedPayload = `${timestamp}.${bodyString}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret.trim())
    .update(signedPayload)
    .digest('hex');

  const providedBuf = new Uint8Array(Buffer.from(signature, 'utf8'));
  const expectedBuf = new Uint8Array(Buffer.from(expectedSignature, 'utf8'));

  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    throw new Error('Invalid signature: HMAC verification failed');
  }

  try {
    return JSON.parse(bodyString) as ElevenLabsWebhookEvent;
  } catch (err) {
    throw new Error(`Failed to parse ElevenLabs webhook payload as JSON: ${(err as Error).message}`);
  }
}
