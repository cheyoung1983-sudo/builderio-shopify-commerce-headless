import { describe, it, expect } from 'vitest'
import {
  validateZrmConfiguration,
  redactSensitivePayload,
} from '../lib/compliance/hipaa'

describe('HIPAA & Zero Retention Mode Guard', () => {
  it('should allow valid BAA models when ZRM is active', () => {
    const validModels = [
      'claude-3-5-sonnet',
      'gemini-2.5-flash',
      'gpt-4o',
      'qwen35-397b-a17b',
    ]
    for (const model of validModels) {
      const res = validateZrmConfiguration(model, true)
      expect(res.valid).toBe(true)
    }
  })

  it('should reject non-BAA models when ZRM is active', () => {
    const res = validateZrmConfiguration(
      'unapproved-experimental-model',
      true
    )
    expect(res.valid).toBe(false)
    expect(res.error).toContain('not supported under Zero Retention Mode')
  })

  it('should redact sensitive PII/PHI strings in payload', () => {
    const payload = {
      user: 'John Doe',
      phone: '+18005550199',
      notes: 'Patient SSN 000-00-0000 info',
    }
    const redacted = redactSensitivePayload(payload)
    expect(redacted.phone).toBe('[REDACTED]')
    expect(redacted.notes).not.toContain('+18005550199')
  })
})
