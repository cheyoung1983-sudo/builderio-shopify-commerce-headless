/**
 * services/persona.ts
 * Central service for Persona API interactions.
 */

export const PERSONA_API_KEY = process.env.PERSONA_API_KEY;

export class PersonaError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public detail?: any
  ) {
    super(message);
    this.name = 'PersonaError';
  }
}

export async function personaRequest(path: string, options: RequestInit = {}) {
  if (!PERSONA_API_KEY) {
    throw new Error('Persona API key not configured.');
  }

  const response = await fetch(`https://api.withpersona.com/api/v1${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${PERSONA_API_KEY}`,
      'Content-Type': 'application/json',
      'Persona-Version': '2023-01-05',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new PersonaError(
      errorData.detail?.message || response.statusText,
      response.status,
      errorData.detail
    )
  }

  return response
}

/**
 * Creates a server-side Persona inquiry to lock prefill parameters and ensure security.
 * (Per Architectural Implementation Framework, Section 2)
 */
export async function createPersonaInquiry(params: {
  referenceId: string
  inquiryTemplateId?: string
  fields?: Record<string, any>
  isWebView?: boolean
}): Promise<{ id: string; hostedUrl: string }> {
  if (!PERSONA_API_KEY) {
    // Sandbox / Mock session when API keys are pending
    const mockId = `inq_sandbox_${Date.now()}`
    const webViewParam = params.isWebView ? '&is-webview=true' : ''
    return {
      id: mockId,
      hostedUrl: `https://withpersona.com/verify?inquiry-id=${encodeURIComponent(mockId)}${webViewParam}`,
    }
  }

  const templateId =
    params.inquiryTemplateId || process.env.PERSONA_INQUIRY_TEMPLATE_ID || 'itmpl_tribal_id'

  const response = await personaRequest('/inquiries', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'inquiry',
        attributes: {
          'inquiry-template-id': templateId,
          'reference-id': params.referenceId,
          fields: params.fields,
        },
      },
    }),
  })

  const json = await response.json()
  const inqId = json.data?.id
  const webViewParam = params.isWebView ? '&is-webview=true' : ''
  return {
    id: inqId,
    hostedUrl: `https://withpersona.com/verify?inquiry-id=${encodeURIComponent(inqId)}${webViewParam}`,
  }
}

/**
 * Searches for an existing incomplete inquiry ('created' or 'pending') by reference ID.
 */
export async function findIncompleteInquiry(referenceId: string): Promise<any | null> {
  if (!PERSONA_API_KEY) {
    return null
  }
  try {
    const params = new URLSearchParams({
      'filter[reference-id]': referenceId,
      'filter[status]': 'created,pending',
      'page[size]': '1',
    })
    const response = await personaRequest(`/inquiries?${params.toString()}`)
    const json = await response.json()
    const inquiries = json?.data || []
    return inquiries.length > 0 ? inquiries[0] : null
  } catch (error) {
    console.warn('[Persona] Error finding incomplete inquiry:', error)
    return null
  }
}

/**
 * Generates a session token for resuming a pending inquiry.
 */
export async function createSessionToken(inquiryId: string): Promise<string | null> {
  if (!PERSONA_API_KEY) {
    return `sess_sandbox_${Date.now()}`
  }
  try {
    const response = await personaRequest(`/inquiries/${inquiryId}/resume`, {
      method: 'POST',
      body: JSON.stringify({ meta: {} }),
    })
    const json = await response.json()
    return json?.meta?.['session-token'] || null
  } catch (error) {
    console.warn('[Persona] Error generating session token:', error)
    return null
  }
}

/**
 * Generates a One-Time Link (OTL) for resuming a browser hosted flow securely.
 */
export async function generateOneTimeLink(inquiryId: string): Promise<string | null> {
  if (!PERSONA_API_KEY) {
    return `https://inquiry.withpersona.com/verify?code=otl_sandbox_${Date.now()}`
  }
  try {
    const response = await personaRequest(`/inquiries/${inquiryId}/generate-one-time-link`, {
      method: 'POST',
      body: JSON.stringify({ meta: {} }),
    })
    const json = await response.json()
    return json?.meta?.['one-time-link-code']
      ? `https://inquiry.withpersona.com/verify?code=${json.meta['one-time-link-code']}`
      : null
  } catch (error) {
    console.warn('[Persona] Error generating one-time link:', error)
    return null
  }
}

