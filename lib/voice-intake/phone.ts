/**
 * Normalizes common US phone formats to E.164 (+1XXXXXXXXXX).
 * Accepts e.g. "(509) 255-3852", "509-255-3852", "509.255.3852",
 * "5092553852", "1 509 255 3852", "+1 (509) 255-3852".
 * Returns null for anything that isn't a valid NANP number (area code and
 * exchange must start with 2-9), including letters and extensions.
 */
export function normalizeUsPhone(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed || trimmed.length > 32) return null
  // Only digits, spaces and common separators are allowed.
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return null

  let digits = trimmed.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1)
  if (digits.length !== 10) return null
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null
  return `+1${digits}`
}
