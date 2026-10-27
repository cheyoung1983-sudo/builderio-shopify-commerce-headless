/**
 * Persona MCP (Model Context Protocol) Client
 * Connects to https://mcp.withpersona.com using Bearer token authentication.
 */

const PERSONA_MCP_ENDPOINT = 'https://mcp.withpersona.com'

export interface PersonaMcpQueryOptions {
  prompt: string
  context?: Record<string, unknown>
  apiKey?: string
}

export interface PersonaMcpResponse {
  success: boolean
  result?: any
  error?: string
}

export async function queryPersonaMcp(options: PersonaMcpQueryOptions): Promise<PersonaMcpResponse> {
  const apiKey = options.apiKey || process.env.PERSONA_MCP_API_KEY

  if (!apiKey) {
    return {
      success: false,
      error: 'Persona MCP API key is not configured (PERSONA_MCP_API_KEY missing).',
    }
  }

  try {
    const res = await fetch(PERSONA_MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: options.prompt,
        context: options.context || {},
      }),
    })

    const data: any = await res.json().catch(() => null)

    if (!res.ok) {
      return {
        success: false,
        error: data?.error || `Persona MCP server responded with status ${res.status}`,
      }
    }

    return {
      success: true,
      result: data?.result || data,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to connect to Persona MCP Server.',
    }
  }
}

/**
 * Cross-references fraud signals between Persona and internal database/inquiries.
 */
export async function crossReferenceFraudSignals(inquiryId: string, customerEmail?: string): Promise<PersonaMcpResponse> {
  const prompt = `Cross-reference fraud signals for Persona inquiry ${inquiryId}${customerEmail ? ` and email ${customerEmail}` : ''}. Identify discrepancies between Persona verification telemetry and internal database records.`
  return queryPersonaMcp({ prompt, context: { inquiryId, customerEmail } })
}
