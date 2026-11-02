import crypto from 'crypto';
import { db } from '@lib/db';
import { wholesaleApiKeys } from '@lib/db/schema/wholesale';
import { eq } from 'drizzle-orm';

/**
 * Validates a wholesale API key using a secure, constant-time comparison.
 *
 * Key format: pk_live_<prefix>.<secret>
 */
export async function validateWholesaleApiKey(apiKey: string) {
  if (!apiKey) {
    throw new Error('Missing API key');
  }

  const parts = apiKey.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid API key format. Expected pk_live_prefix.secret');
  }

  const [prefix, secret] = parts;

  // 1. Fetch the hashed secret by the public prefix
  const [keyRecord] = await db
    .select()
    .from(wholesaleApiKeys)
    .where(eq(wholesaleApiKeys.keyPrefix, prefix))
    .limit(1);

  if (!keyRecord || keyRecord.status !== 'active') {
    throw new Error('Invalid or revoked API key');
  }

  // 2. Hash the provided secret using SHA-256
  const computedHash = crypto
    .createHash('sha256')
    .update(secret)
    .digest('hex');

  // 3. Constant-time comparison to prevent timing attacks
  const storedHashBuffer = Buffer.from(keyRecord.hashedSecret, 'hex');
  const computedHashBuffer = Buffer.from(computedHash, 'hex');

  if (
    storedHashBuffer.length !== computedHashBuffer.length ||
    !crypto.timingSafeEqual(new Uint8Array(storedHashBuffer), new Uint8Array(computedHashBuffer))
  ) {
    throw new Error('Invalid API key');
  }

  return keyRecord;
}

/**
 * Utility to generate a new secure API key for a partner.
 */
export async function generateWholesaleApiKey(accountUid: string, partnerName: string) {
  const prefix = `pk_live_${crypto.randomBytes(6).toString('hex')}`;
  const secret = crypto.randomBytes(32).toString('hex');
  const hashedSecret = crypto
    .createHash('sha256')
    .update(secret)
    .digest('hex');

  await db.insert(wholesaleApiKeys).values({
    accountUid,
    keyPrefix: prefix,
    hashedSecret: hashedSecret,
    status: 'active',
  });

  // Return the plain text key to the user ONCE. It cannot be recovered.
  return `${prefix}.${secret}`;
}
