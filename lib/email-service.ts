export {
  sendTribalVerificationConfirmationEmail,
  default,
} from './tribal/email-service.ts'
export type { EmailServiceConfig, EmailDispatchResult } from './tribal/email-service.ts'
export {
  generateTribalVerificationHtmlEmail,
  generateTribalVerificationTextEmail,
} from './tribal/email-templates.ts'
export type { TribalVerificationEmailData } from './tribal/email-templates.ts'
