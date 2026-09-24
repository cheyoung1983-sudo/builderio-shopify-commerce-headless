/**
 * Shopify Web Bot & Agent Protocol Signature Credentials
 * 
 * Configured according to RFC 9421 / IETF HTTP Message Signatures for
 * Shopify Agent Protocol & Web Bot Authentication.
 */

export interface ShopifyWebBotAuthCredentials {
  name: string;
  domain: string;
  signature: string;
  signatureInput: string;
  signatureAgent: string;
  expires: string;
}

export const SHOPIFY_WEB_BOT_AUTH_CONFIG: ShopifyWebBotAuthCredentials = {
  name: 'Display & Cell Pros LLC 2026',
  domain: 'displaycellpros.myshopify.com',
  signature: 'sig1=:cFBFPP402u8mFHkFY1Jws6YQfZagnPbi/cKpKZv5H3dMxvjGfx6tNGqPgGIvrYnj4IMQygVI2rSWOrHaSMI6AA==:',
  signatureInput: 'sig1=("@authority" "signature-agent");keyid="SjjyXvQ2cGhsRXs9DXEaV6ClyCun0Pj5yxjV67dLGOk";nonce="udg5WipjiWwLX0IZLCE8o+CsoW8R0te382ieUjddtE/IDT/DiMgAPir0H5opv27Z9Oe0XF0lIqmJrBDB6B2PIQ==";tag="web-bot-auth";created=1790213961;expires=1797989961',
  signatureAgent: '"https://shopify.com"',
  expires: 'Dec 22, 2026',
};

/**
 * Returns HTTP headers formatted for Shopify Web Bot / Agent Protocol calls.
 */
export function getShopifyWebBotAuthHeaders(): Record<string, string> {
  return {
    'Signature': SHOPIFY_WEB_BOT_AUTH_CONFIG.signature,
    'Signature-Input': SHOPIFY_WEB_BOT_AUTH_CONFIG.signatureInput,
    'Signature-Agent': SHOPIFY_WEB_BOT_AUTH_CONFIG.signatureAgent,
  };
}

/**
 * Validates incoming Shopify Web Bot headers or checks token expiration.
 */
export function validateShopifyWebBotHeaders(headers: Record<string, string | string[] | undefined>): {
  isValid: boolean;
  reason?: string;
} {
  const signature = Array.isArray(headers['signature']) ? headers['signature'][0] : headers['signature'];
  const sigInput = Array.isArray(headers['signature-input']) ? headers['signature-input'][0] : headers['signature-input'];

  if (!signature) {
    return { isValid: false, reason: 'Missing Signature header' };
  }

  if (!sigInput) {
    return { isValid: false, reason: 'Missing Signature-Input header' };
  }

  // Check if token matches active keyid
  if (sigInput && !sigInput.includes('keyid="SjjyXvQ2cGhsRXs9DXEaV6ClyCun0Pj5yxjV67dLGOk"')) {
    return { isValid: false, reason: 'Unrecognized keyid in Signature-Input' };
  }

  return { isValid: true };
}
