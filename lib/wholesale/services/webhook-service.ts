import crypto from 'crypto';
import axios from 'axios';
import { db } from '@lib/db';
import { wholesaleWebhooks } from '@lib/db/schema/wholesale';
import { eq } from 'drizzle-orm';

export interface WebhookEvent {
  event: string;
  timestamp: string;
  data: any;
}

export class WebhookService {
  /**
   * Dispatches an event to all subscribed partner endpoints.
   */
  static async dispatch(partnerUid: string, eventType: string, eventData: any) {
    // 1. Fetch subscriptions for this partner
    // Note: In the schema we defined, we'd need a partner_webhooks table
    // For this implementation, we'll assume a simple one-to-one mapping for now
    // or use a dedicated config.

    const payload: WebhookEvent = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: eventData,
    };

    const payloadString = JSON.stringify(payload);

    // In a real implementation, we would loop through multiple target URLs
    // We'll simulate one target URL here
    const targetUrl = process.env.PARTNER_WEBHOOK_URL;
    if (!targetUrl) {
      throw new Error('PARTNER_WEBHOOK_URL environment variable is not set');
    }
    const secret = process.env.PARTNER_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('PARTNER_WEBHOOK_SECRET environment variable is not set');
    }

    // 2. Sign the payload with HMAC-SHA256
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    try {
      const response = await axios.post(targetUrl, payloadString, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': eventType,
        },
        timeout: 5000,
      });

      // Log success
      await db.insert(wholesaleWebhooks).values({
        accountUid: partnerUid,
        eventType,
        payload,
        responseStatus: response.status,
        success: true,
      });

    } catch (error: any) {
      console.error(`Webhook delivery failed for ${eventType}:`, error.message);

      // Log failure for retry logic
      await db.insert(wholesaleWebhooks).values({
        accountUid: partnerUid,
        eventType,
        payload,
        responseStatus: error.response?.status || 500,
        success: false,
      });

      // Here we would typically enqueue a BullMQ/Upstash retry job
    }
  }
}
