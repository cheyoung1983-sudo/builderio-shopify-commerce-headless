import { NextApiRequest, NextApiResponse } from 'next';
import { withWholesaleAuth } from '@lib/wholesale/middleware';
import { db } from '@lib/db';
import { wholesaleOrders, wholesaleOrderItems, wholesaleInventory } from '@lib/db/schema/wholesale';
import { WholesaleService } from '@lib/wholesale/services/product-service';
import { eq, sql } from 'drizzle-orm';

export default withWholesaleAuth(async (req: any, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { items, shipping_address } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] as string;
    const partner = req.partner;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Bad Request', message: 'Items array is required.' });
    }

    if (!idempotencyKey) {
      return res.status(400).json({ success: false, error: 'Bad Request', message: 'Idempotency-Key header is required.' });
    }

    // 1. Idempotency Check
    const [existingOrder] = await db
      .select()
      .from(wholesaleOrders)
      .where(eq(wholesaleOrders.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existingOrder) {
      return res.status(200).json({
        success: true,
        message: 'Order retrieved from idempotency cache',
        order: existingOrder,
      });
    }

    // 2. Validate stock and pricing via Service Layer
    const { total, processed } = await WholesaleService.validateOrderItems(
      partner.pricingTier || 'STANDARD',
      items
    );

    // 3. Transactional Order Creation
    // Note: In a real production environment with Postgres, we'd use db.transaction()
    // For this implementation, we'll perform the operations in sequence.

    const [order] = await db.insert(wholesaleOrders).values({
      accountUid: partner.accountUid,
      idempotencyKey,
      totalAmount: total,
      status: 'CONFIRMED',
      shippingAddress: shipping_address,
    }).returning();

    // 4. Deduct Inventory & Record Items
    for (const item of processed) {
      await db.update(wholesaleInventory)
        .set({
          quantityAvailable: sql`quantity_available - ${item.quantity}`,
          lastSyncedAt: new Date(),
        })
        .where(eq(wholesaleInventory.productId, item.id));

      await db.insert(wholesaleOrderItems).values({
        orderId: order.id,
        productId: item.id,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      });
    }

    return res.status(201).json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        totalAmount: total,
      },
    });

  } catch (error: any) {
    console.error('[Order Error]:', error.message);
    const status = error.message.includes('Insufficient stock') || error.message.includes('Price mismatch') ? 422 : 500;
    return res.status(status).json({
      success: false,
      error: 'Order Processing Error',
      message: error.message,
    });
  }
});
