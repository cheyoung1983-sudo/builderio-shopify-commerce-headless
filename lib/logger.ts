/**
 * Simple logger that scrubs common PII fields from objects and strings.
 */

const PII_KEYWORDS = [
  'ssn', 'tax_id', 'birthdate', 'dob', 'email', 'phone', 
  'name_first', 'name_last', 'address', 'password', 'secret', 'token', 'key'
]

function scrub(data: any): any {
  if (typeof data === 'string') {
    let scrubbed = data
    PII_KEYWORDS.forEach(kw => {
      const regex = new RegExp(`("${kw}"\\s*:\\s*")[^"]+(")`, 'gi')
      scrubbed = scrubbed.replace(regex, `$1[REDACTED]$2`)
    })
    return scrubbed
  }

  if (Array.isArray(data)) {
    return data.map(scrub)
  }

  if (data !== null && typeof data === 'object') {
    const scrubbed: any = {}
    for (const key in data) {
      if (PII_KEYWORDS.some(kw => key.toLowerCase().includes(kw))) {
        scrubbed[key] = '[REDACTED]'
      } else {
        scrubbed[key] = scrub(data[key])
      }
    }
    return scrubbed
  }

  return data
}

export const logger = {
  info: (msg: string, ...args: any[]) => console.info(`[INFO] ${msg}`, ...args.map(scrub)),
  warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${msg}`, ...args.map(scrub)),
  error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args.map(scrub)),
}
