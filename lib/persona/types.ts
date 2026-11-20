/**
 * lib/persona/types.ts
 * Strongly-typed Persona OpenAPI definitions for Inquiries, Verifications, and Accounts.
 */

export type InquiryStatus = 'created' | 'pending' | 'completed' | 'approved' | 'declined' | 'failed' | 'expired' | 'needs_review'

export type VerificationStatus = 'initiated' | 'confirmed' | 'submitted' | 'passed' | 'requires_retry' | 'failed'

export interface PersonaInquiryAttributes {
  status: InquiryStatus
  'reference-id'?: string
  'inquiry-template-id'?: string
  fields?: Record<string, any>
  'created-at'?: string
  'submitted-at'?: string
  'approved-at'?: string
}

export interface PersonaInquiry {
  id: string
  type: 'inquiry'
  attributes: PersonaInquiryAttributes
  relationships?: {
    verifications?: {
      data: Array<{ type: string; id: string }>
    }
    account?: {
      data?: { type: string; id: string }
    }
  }
}

export interface PersonaVerificationAttributes {
  status: VerificationStatus
  'check-results'?: Record<string, string>
  'submitted-at'?: string
}

export interface PersonaVerification {
  id: string
  type: string
  attributes: PersonaVerificationAttributes
}

export interface PersonaAccountAttributes {
  'account-type-key': string
  status: string
  fields: Record<string, any>
  identifiers?: Record<string, any>
}

export interface PersonaAccount {
  id: string
  type: 'account'
  attributes: PersonaAccountAttributes
}

export interface PersonaWebhookPayload {
  event: string
  type?: string
  data: {
    id: string
    type: string
    attributes: Record<string, any>
  }
  meta?: Record<string, any>
}
