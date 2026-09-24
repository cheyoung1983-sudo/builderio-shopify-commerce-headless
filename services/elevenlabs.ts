/**
 * services/elevenlabs.ts
 * Central service for ElevenLabs API interactions.
 */

export const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export class ElevenLabsError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public detail?: any
  ) {
    super(message);
    this.name = 'ElevenLabsError';
  }
}

export async function elevenLabsRequest(path: string, options: RequestInit = {}) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not configured.');
  }

  const response = await fetch(`https://api.elevenlabs.io/v1${path}`, {
    ...options,
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ElevenLabsError(
      errorData.detail?.message || response.statusText,
      response.status,
      errorData.detail
    );
  }

  return response;
}
