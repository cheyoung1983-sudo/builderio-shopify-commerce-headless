import { describe, it, expect } from 'vitest'
import { getVerbalDisclosure } from '../lib/compliance/disclosures'

describe('Disclosure Compliance Helper', () => {
  it('should generate standard verbal disclosure prompt', () => {
    const statement = getVerbalDisclosure('Display Cell Pros')
    expect(statement).toContain('AI assistant')
    expect(statement).toContain('Display Cell Pros')
    expect(statement).toContain('recorded and processed')
  })
})
