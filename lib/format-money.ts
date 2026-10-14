/**
 * Format a Shopify money amount (a decimal string such as "108.0") for
 * display, always with two decimals and the currency symbol: "$108.00".
 * Returns '' for a missing or non-numeric amount.
 */
export function formatMoney(amount?: string | number | null, currencyCode = 'USD'): string {
  if (amount === undefined || amount === null || amount === '') return ''
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount)
  if (!Number.isFinite(numeric)) return ''
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric)
  } catch {
    return `$${numeric.toFixed(2)}`
  }
}
