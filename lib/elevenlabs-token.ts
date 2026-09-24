export interface ElevenLabsTokenOptions {
  agentId: string;
  apiKey?: string;
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
}

export interface ElevenLabsTokenResult {
  token: string;
  conversationId?: string;
  attempts: number;
}

export interface ElevenLabsHttpErrorDetails {
  status: number;
  statusText: string;
  url: string;
  agentId: string;
  attempt: number;
  responseBody: string;
  parsedBody?: Record<string, unknown>;
  category: 'authentication' | 'not_found' | 'rate_limit' | 'server_error' | 'client_error' | 'unknown';
  isRetryable: boolean;
  responseHeaderKeys?: string[];
}

export class ElevenLabsTokenError extends Error {
  public details: ElevenLabsHttpErrorDetails;

  constructor(message: string, details: ElevenLabsHttpErrorDetails) {
    super(message);
    this.name = 'ElevenLabsTokenError';
    this.details = details;
  }
}

/**
 * Categorize HTTP status and response payload into actionable diagnostics.
 */
function categorizeError(status: number, responseBody: string, parsedBody?: Record<string, unknown>): {
  category: ElevenLabsHttpErrorDetails['category'];
  isRetryable: boolean;
} {
  const isKeyError =
    status === 401 ||
    status === 403 ||
    (status === 400 &&
      (responseBody.includes('invalid_api_key') ||
        responseBody.includes('api_key_id_used_as_api_key') ||
        parsedBody?.type === 'authentication_error' ||
        (parsedBody?.details as Record<string, unknown>)?.type === 'authentication_error'));

  if (isKeyError) {
    return { category: 'authentication', isRetryable: false };
  }

  if (status === 404) {
    return { category: 'not_found', isRetryable: false };
  }

  if (status === 429) {
    return { category: 'rate_limit', isRetryable: true };
  }

  if (status >= 500 && status < 600) {
    return { category: 'server_error', isRetryable: true };
  }

  if (status >= 400 && status < 500) {
    return { category: 'client_error', isRetryable: false };
  }

  return { category: 'unknown', isRetryable: true };
}

function maskApiKey(key?: string): string {
  if (!key) return '[NOT_PROVIDED]';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '****';
  return `${trimmed.substring(0, 4)}...${trimmed.substring(trimmed.length - 4)}`;
}

/**
 * Utility function to acquire an ephemeral ElevenLabs conversation token
 * with an exponential backoff retry strategy and explicit logging of
 * HTTP status codes and response bodies.
 */
export async function acquireElevenLabsTokenWithBackoff(
  options: ElevenLabsTokenOptions
): Promise<ElevenLabsTokenResult> {
  const {
    agentId,
    apiKey,
    maxRetries = 3,
    initialDelayMs = 500,
    maxDelayMs = 4000,
    backoffFactor = 2,
  } = options;

  const rawKey = (apiKey || '').trim();
  let useApiKey = rawKey || undefined;

  let lastError: Error | null = null;
  const totalAttempts = maxRetries + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    const isFinalAttempt = attempt === totalAttempts;

    const endpoint = useApiKey
      ? `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`
      : `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(
          agentId
        )}&source=js_sdk&version=0.0.8`;

    try {
      console.log(
        `[ElevenLabs:Token:Fetch] [Attempt ${attempt}/${totalAttempts}] Outbound request to ${endpoint} | Headers: Accept="application/json", x-agent-id="${agentId}", xi-api-key="${maskApiKey(useApiKey)}"`
      );

      const headers: Record<string, string> = {
        Accept: 'application/json',
        'x-agent-id': agentId,
      };
      if (useApiKey) {
        headers['xi-api-key'] = useApiKey;
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      const responseHeaderKeys = Array.from(response.headers.keys()).sort();
      console.log(
        `[ElevenLabs:Token:ResponseHeaders] [Attempt ${attempt}/${totalAttempts}] HTTP ${response.status} ${response.statusText} | ElevenLabs response header keys received (values excluded):`,
        responseHeaderKeys
      );

      const rawResponseBody = await response.text();
      let parsedBody: Record<string, unknown> | undefined;

      try {
        parsedBody = JSON.parse(rawResponseBody);
      } catch {
        // Non-JSON response body
      }

      if (!response.ok) {
        const { category, isRetryable } = categorizeError(
          response.status,
          rawResponseBody,
          parsedBody
        );

        // If the key was rejected (e.g. invalid key ID or revoked key), try falling back to public agent access immediately
        if (useApiKey && category === 'authentication') {
          console.warn(
            `[ElevenLabs:Token:Fallback] API key was rejected by ElevenLabs (HTTP ${response.status} ${response.statusText}). Disabling API key header and retrying as public agent...`,
            rawResponseBody
          );
          useApiKey = undefined;
          // Continue loop immediately to retry without key
          continue;
        }

        // Explicit HTTP error code and response body logging for unhandled errors
        console.error(`[ElevenLabs:Token:HttpError] [Attempt ${attempt}/${totalAttempts}] HTTP ${response.status} ${response.statusText}`, {
          status: response.status,
          statusText: response.statusText,
          category,
          isRetryable,
          agentId,
          attempt,
          responseBody: rawResponseBody,
          parsedBody,
        });

        const errorDetails: ElevenLabsHttpErrorDetails = {
          status: response.status,
          statusText: response.statusText,
          url: endpoint,
          agentId,
          attempt,
          responseBody: rawResponseBody,
          parsedBody,
          category,
          isRetryable,
          responseHeaderKeys,
        };

        const errorMsg =
          (typeof parsedBody?.detail === 'object'
            ? (parsedBody?.detail as Record<string, unknown>)?.message || (parsedBody?.detail as Record<string, unknown>)?.status
            : parsedBody?.detail) ||
          (parsedBody?.message as string) ||
          `ElevenLabs API returned HTTP ${response.status} (${response.statusText})`;

        const tokenError = new ElevenLabsTokenError(String(errorMsg), errorDetails);

        if (!isRetryable || isFinalAttempt) {
          throw tokenError;
        }

        lastError = tokenError;
      } else {
        // Successfully retrieved token or signed URL
        let extractedToken: string | undefined = typeof parsedBody?.token === 'string' ? parsedBody.token : undefined;
        const conversationId: string | undefined = typeof parsedBody?.conversation_id === 'string' ? parsedBody.conversation_id : undefined;

        if (!extractedToken && typeof parsedBody?.signed_url === 'string') {
          try {
            const urlObj = new URL(parsedBody.signed_url);
            const tokenParam = urlObj.searchParams.get('token');
            if (tokenParam) {
              extractedToken = tokenParam;
            } else {
              extractedToken = parsedBody.signed_url;
            }
          } catch {
            const match = parsedBody.signed_url.match(/token=([^&]+)/);
            extractedToken = match?.[1] ? decodeURIComponent(match[1]) : parsedBody.signed_url;
          }
        }

        if (!extractedToken) {
          console.error('[ElevenLabs:Token:InvalidPayload] Missing token or signed_url property in successful response:', rawResponseBody);
          throw new ElevenLabsTokenError('Missing token or signed_url in ElevenLabs response payload', {
            status: response.status,
            statusText: response.statusText,
            url: endpoint,
            agentId,
            attempt,
            responseBody: rawResponseBody,
            parsedBody,
            category: 'client_error',
            isRetryable: false,
          });
        }

        console.log(
          `[ElevenLabs:Token:Success] [Attempt ${attempt}/${totalAttempts}] Successfully acquired token for agent: "${agentId}"`
        );

        return {
          token: extractedToken,
          conversationId,
          attempts: attempt,
        };
      }
    } catch (err) {
      lastError = err as Error;

      if (err instanceof ElevenLabsTokenError && !err.details.isRetryable) {
        console.warn(
          `[ElevenLabs:Token:Abort] Non-retryable error encountered (${err.details.category}). Skipping further retries.`
        );
        break;
      }

      if (isFinalAttempt) {
        break;
      }

      // Exponential backoff calculation with jitter: initialDelay * factor^(attempt - 1) + jitter
      const exponentialDelay = initialDelayMs * Math.pow(backoffFactor, attempt - 1);
      const jitter = Math.floor(Math.random() * 150);
      const backoffDelay = Math.min(maxDelayMs, Math.round(exponentialDelay + jitter));

      console.warn(
        `[ElevenLabs:Token:Backoff] [Attempt ${attempt} Failed] Retrying in ${backoffDelay}ms... Reason: ${
          lastError?.message || 'Unknown network error'
        }`
      );

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw lastError || new Error('Failed to acquire ElevenLabs conversation token after retries');
}
