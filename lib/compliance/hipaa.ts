export const ZRM_APPROVED_MODELS = [
  'claude-3-7-sonnet',
  'claude-3-5-sonnet',
  'claude-3-haiku',
  'claude-sonnet-4',
  'claude-sonnet-4-5',
  'claude-sonnet-4-6',
  'claude-sonnet-5',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-3.5-flash',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4.1',
  'gpt-4-turbo',
  'gpt-5',
  'gpt-5.1',
  'gpt-5.2',
  'gpt-5.4',
  'qwen35-397b-a17b',
  'glm-52',
  'custom-llm',
]

export function validateZrmConfiguration(
  model: string,
  isZrmActive: boolean
): { valid: boolean; error?: string } {
  if (!isZrmActive) {
    return { valid: true }
  }

  const normalizedModel = model.toLowerCase().trim()
  const isApproved = ZRM_APPROVED_MODELS.some((approved) =>
    normalizedModel.includes(approved)
  )

  if (!isApproved) {
    return {
      valid: false,
      error: `Model '${model}' is not supported under Zero Retention Mode (ZRM). Please select a BAA-compliant model or use Custom LLM.`,
    }
  }

  return { valid: true }
}

export function redactSensitivePayload<T>(data: T): T {
  if (typeof data === 'string') {
    let redacted: string = data
    redacted = redacted.replace(/\+?[1-9]\d{1,14}/g, '[REDACTED]')
    redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
    redacted = redacted.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '[REDACTED_EMAIL]'
    )
    return redacted as unknown as T
  }

  if (data && typeof data === 'object') {
    const copy: any = Array.isArray(data) ? [] : {}
    for (const key of Object.keys(data)) {
      if (
        ['phone', 'phoneNumber', 'ssn', 'email', 'patientName'].includes(key)
      ) {
        copy[key] = '[REDACTED]'
      } else {
        copy[key] = redactSensitivePayload((data as any)[key])
      }
    }
    return copy as T
  }

  return data
}
