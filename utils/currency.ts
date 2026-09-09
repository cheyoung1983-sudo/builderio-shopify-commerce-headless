/**
 * Currency and Price Formatting Utilities
 * 
 * Supports Shopify Storefront `moneyFormat` templates, Shopify price objects,
 * standard ISO currency codes, and custom currency symbol formatting.
 */

export interface FormatMoneyOptions {
  /** ISO 4217 Currency Code (e.g. 'USD', 'EUR', 'GBP', 'CAD', 'JPY') */
  currency?: string
  /**
   * Shopify moneyFormat string template (e.g. '${{amount}}', '€{{amount_with_comma_separator}}')
   * If provided, takes precedence to match the store's exact theme formatting settings.
   */
  moneyFormat?: string
  /** BCP 47 language tag for number localization (e.g. 'en-US', 'de-DE') */
  locale?: string
  /** Explicit number of decimal places (overrides template if specified) */
  precision?: number
  /** Whether to include the currency symbol (default: true) */
  showSymbol?: boolean
  /** Whether to append the currency code, e.g. '$10.00 USD' (default: false) */
  showCode?: boolean
}

/**
 * Common currency symbols mapped by ISO 4217 code
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  CAD: 'CA$',
  AUD: 'A$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  CHF: 'CHF',
  NZD: 'NZ$',
  SGD: 'S$',
  HKD: 'HK$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  MXN: 'Mex$',
  BRL: 'R$',
  KRW: '₩',
  ZAR: 'R',
}

/**
 * Default fallback currency if none is provided
 */
export const DEFAULT_CURRENCY = 'USD'

/**
 * Default Shopify money format
 */
export const DEFAULT_MONEY_FORMAT = '${{amount}}'

/**
 * Parses numeric price from string or number safely.
 * Returns 0 if input is invalid or falsy.
 */
export function parsePrice(price: string | number | null | undefined): number {
  if (price === null || price === undefined || price === '') {
    return 0
  }
  if (typeof price === 'number') {
    return isNaN(price) ? 0 : price
  }
  // Remove spaces, currency symbols, and commas if used as thousands separators
  const clean = price.toString().trim()
  const parsed = parseFloat(clean.replace(/[^0-9.-]+/g, ''))
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Gets the currency symbol for a given ISO 4217 currency code.
 */
export function getCurrencySymbol(currencyCode: string = DEFAULT_CURRENCY, locale?: string): string {
  const code = currencyCode.toUpperCase()
  if (CURRENCY_SYMBOLS[code]) {
    return CURRENCY_SYMBOLS[code]
  }
  try {
    const formatter = new Intl.NumberFormat(locale || undefined, {
      style: 'currency',
      currency: code,
    })
    const parts = formatter.formatToParts(0)
    const symbolPart = parts.find((part) => part.type === 'currency')
    return symbolPart ? symbolPart.value : code
  } catch {
    return code
  }
}

/**
 * Formats a raw number using Shopify separator conventions:
 * - {{amount}}: 1,234.56 (comma thousands, period decimal)
 * - {{amount_no_decimals}}: 1,235 (comma thousands, rounded to integer)
 * - {{amount_with_comma_separator}}: 1.234,56 (period thousands, comma decimal)
 * - {{amount_no_decimals_with_comma_separator}}: 1.234 (period thousands, integer)
 * - {{amount_with_space_separator}}: 1 234,56 (space thousands, comma decimal)
 * - {{amount_no_decimals_with_space_separator}}: 1 234 (space thousands, integer)
 * - {{amount_with_apostrophe_separator}}: 1'234.56 (apostrophe thousands, period decimal)
 */
function formatAmountPattern(
  amount: number,
  token: string,
  precisionOverride?: number
): string {
  const isNoDecimals = token.includes('no_decimals')
  const decimals = precisionOverride !== undefined ? precisionOverride : isNoDecimals ? 0 : 2

  const fixedString = amount.toFixed(decimals)
  const [integerPart, decimalPart] = fixedString.split('.')

  let thousandsSeparator = ','
  let decimalSeparator = '.'

  if (token.includes('with_comma_separator')) {
    thousandsSeparator = '.'
    decimalSeparator = ','
  } else if (token.includes('with_space_separator')) {
    thousandsSeparator = ' '
    decimalSeparator = ','
  } else if (token.includes('with_apostrophe_separator')) {
    thousandsSeparator = "'"
    decimalSeparator = '.'
  }

  // Format integer portion with thousands separator
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator)

  if (decimals > 0 && decimalPart !== undefined) {
    return `${formattedInteger}${decimalSeparator}${decimalPart}`
  }

  return formattedInteger
}

/**
 * Formats a price using Shopify's Liquid `moneyFormat` template string.
 * Examples of format string:
 *   - "${{amount}}"
 *   - "€{{amount_with_comma_separator}}"
 *   - "{{amount}} USD"
 *   - "£{{amount_no_decimals}}"
 */
export function formatShopifyMoney(
  amount: number | string,
  moneyFormat: string = DEFAULT_MONEY_FORMAT,
  precisionOverride?: number
): string {
  const numericAmount = parsePrice(amount)

  const templateRegex = /\{\{\s*(\w+)\s*\}\}/

  if (!templateRegex.test(moneyFormat)) {
    // If no template token found, fallback to standard formatting
    return `${moneyFormat}${numericAmount.toFixed(precisionOverride !== undefined ? precisionOverride : 2)}`
  }

  return moneyFormat.replace(templateRegex, (_match, token) => {
    return formatAmountPattern(numericAmount, token, precisionOverride)
  })
}

/**
 * Formats a price using Intl.NumberFormat based on currency code and locale.
 */
export function formatIntlPrice(
  amount: number | string,
  currencyCode: string = DEFAULT_CURRENCY,
  locale?: string,
  precision?: number
): string {
  const numericAmount = parsePrice(amount)
  const currency = (currencyCode || DEFAULT_CURRENCY).toUpperCase()

  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: precision !== undefined ? precision : 2,
      maximumFractionDigits: precision !== undefined ? precision : 2,
    }).format(numericAmount)
  } catch {
    // If currency code is unrecognized by Intl, use symbol fallback
    const symbol = getCurrencySymbol(currency)
    const formattedNum = numericAmount.toFixed(precision !== undefined ? precision : 2)
    return `${symbol}${formattedNum}`
  }
}

/**
 * Main currency formatting function.
 * Automatically formats price based on the store's currency settings:
 * - If `options.moneyFormat` or store moneyFormat is provided, applies Shopify template formatting.
 * - Otherwise, applies internationalized currency formatting via Intl.NumberFormat.
 * - Supports options for currency symbol, currency code display, and precision.
 * 
 * @param price Raw price value (number or string, e.g. "19.99" or 19.99)
 * @param options Currency formatting options
 * @returns Formatted price string (e.g. "$19.99", "€19,99 EUR")
 */
export function formatPrice(
  price: string | number | null | undefined,
  optionsOrCurrency?: FormatMoneyOptions | string,
  maybeMoneyFormat?: string
): string {
  // Normalize parameters to support both formatPrice(price, 'USD') and formatPrice(price, { ... })
  let options: FormatMoneyOptions = {}

  if (typeof optionsOrCurrency === 'string') {
    options.currency = optionsOrCurrency
    if (maybeMoneyFormat) {
      options.moneyFormat = maybeMoneyFormat
    }
  } else if (optionsOrCurrency) {
    options = { ...optionsOrCurrency }
  }

  const numericPrice = parsePrice(price)
  const currency = options.currency || DEFAULT_CURRENCY

  let formattedResult: string

  if (options.moneyFormat) {
    formattedResult = formatShopifyMoney(numericPrice, options.moneyFormat, options.precision)
  } else {
    formattedResult = formatIntlPrice(numericPrice, currency, options.locale, options.precision)
  }

  // Handle symbol suppression if requested
  if (options.showSymbol === false) {
    const symbol = getCurrencySymbol(currency, options.locale)
    formattedResult = formattedResult.replace(symbol, '').trim()
  }

  // Handle appending currency code if requested
  if (options.showCode && !formattedResult.includes(currency)) {
    formattedResult = `${formattedResult} ${currency}`
  }

  return formattedResult
}

/**
 * Alias for formatPrice matching standard money formatting conventions.
 */
export const formatMoney = formatPrice

export default formatPrice
