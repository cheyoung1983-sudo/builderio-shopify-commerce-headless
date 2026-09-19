/**
 * Comprehensive email validation utility for client and server.
 * Provides detailed, user-friendly error messages and typo suggestions.
 */

export interface EmailValidationResult {
  isValid: boolean
  error: string | null
  suggestion?: string | null
  sanitizedEmail?: string
}

// RFC 5322 compliant regex for final sanity check
const RFC_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

const COMMON_DOMAIN_TYPOS: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'iclud.com': 'icloud.com',
  'protonmai.com': 'protonmail.com',
}

/**
 * Validates an email address and returns detailed, friendly error messages.
 */
export function validateEmail(value: string | undefined | null): EmailValidationResult {
  if (value === undefined || value === null) {
    return {
      isValid: false,
      error: 'Please enter your email address.',
    }
  }

  const raw = String(value)
  const trimmed = raw.trim()

  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Please enter your email address.',
    }
  }

  if (raw.includes(' ')) {
    return {
      isValid: false,
      error: 'Email address cannot contain spaces.',
    }
  }

  if (trimmed.length > 254) {
    return {
      isValid: false,
      error: 'Email address is too long (maximum 254 characters).',
    }
  }

  // Count '@' occurrences
  const atMatches = trimmed.match(/@/g)
  if (!atMatches || atMatches.length === 0) {
    return {
      isValid: false,
      error: "Please include an '@' in your email address (e.g., name@example.com).",
    }
  }

  if (atMatches.length > 1) {
    return {
      isValid: false,
      error: "Email address can only contain a single '@' symbol.",
    }
  }

  const [localPart, domainPart] = trimmed.split('@')

  // Validate local part (username)
  if (!localPart || localPart.length === 0) {
    return {
      isValid: false,
      error: "Please enter a username before the '@' sign (e.g., name@example.com).",
    }
  }

  if (localPart.length > 64) {
    return {
      isValid: false,
      error: "The username before '@' cannot exceed 64 characters.",
    }
  }

  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return {
      isValid: false,
      error: "The username before '@' cannot start or end with a dot.",
    }
  }

  if (localPart.includes('..')) {
    return {
      isValid: false,
      error: "The username before '@' cannot contain consecutive dots.",
    }
  }

  // Allowed local characters per RFC 5322
  const localCharRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/
  if (!localCharRegex.test(localPart)) {
    return {
      isValid: false,
      error: "The username before '@' contains invalid characters.",
    }
  }

  // Validate domain part
  if (!domainPart || domainPart.length === 0) {
    return {
      isValid: false,
      error: "Please enter a domain name after '@' (e.g., name@example.com).",
    }
  }

  if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
    return {
      isValid: false,
      error: 'Email domain cannot start or end with a dot.',
    }
  }

  if (domainPart.includes('..')) {
    return {
      isValid: false,
      error: 'Email domain cannot contain consecutive dots.',
    }
  }

  if (!domainPart.includes('.')) {
    return {
      isValid: false,
      error: 'Email domain is missing an extension like .com or .net (e.g., name@example.com).',
    }
  }

  const domainLabels = domainPart.split('.')
  const tld = domainLabels[domainLabels.length - 1]

  if (!tld || tld.length < 2) {
    return {
      isValid: false,
      error: 'Email domain extension must be at least 2 characters (e.g., .com, .org).',
    }
  }

  if (!/^[a-zA-Z]+$/.test(tld)) {
    return {
      isValid: false,
      error: 'Email domain extension can only contain letters (e.g., .com, .org).',
    }
  }

  for (const label of domainLabels) {
    if (!label || label.length === 0) {
      return {
        isValid: false,
        error: 'Email domain contains empty label between dots.',
      }
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      return {
        isValid: false,
        error: "Email domain labels cannot start or end with a hyphen '-'.",
      }
    }
    if (!/^[a-zA-Z0-9-]+$/.test(label)) {
      return {
        isValid: false,
        error: 'Email domain contains invalid characters.',
      }
    }
  }

  // Check common typos in domain
  const lowerDomain = domainPart.toLowerCase()
  if (COMMON_DOMAIN_TYPOS[lowerDomain]) {
    const suggestedDomain = COMMON_DOMAIN_TYPOS[lowerDomain]
    const suggestedEmail = `${localPart.toLowerCase()}@${suggestedDomain}`
    return {
      isValid: false,
      error: `Did you mean @${suggestedDomain}? Please enter a valid email address.`,
      suggestion: suggestedEmail,
    }
  }

  // Final RFC regex test
  const sanitized = trimmed.toLowerCase()
  if (!RFC_EMAIL_REGEX.test(sanitized)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address (e.g., name@example.com).',
    }
  }

  return {
    isValid: true,
    error: null,
    sanitizedEmail: sanitized,
  }
}
