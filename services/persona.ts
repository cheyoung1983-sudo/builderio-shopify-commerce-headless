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
}): Promise<{ id: string; hostedUrl: string }> {
  if (!PERSONA_API_KEY) {
    // Sandbox / Mock session when API keys are pending
    const mockId = `inq_sandbox_${Date.now()}`
    return {
      id: mockId,
      hostedUrl: `https://withpersona.com/verify?inquiry-id=${mockId}`,
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
  return {
    id: inqId,
    hostedUrl: `https://withpersona.com/verify?inquiry-id=${inqId}`,
  }
}
