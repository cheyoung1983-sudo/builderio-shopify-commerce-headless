import { db } from '@lib/db';
import { wholesaleProducts, wholesalePricing, wholesaleInventory } from '@lib/db/schema/wholesale';
import { eq, and, gte, sql } from 'drizzle-orm';

export interface WholesaleProduct {
  id: string;
  sku: string;
  title: string;
  unitPrice: number;
  availableStock: number;
}

export class WholesaleService {
  /**
   * Fetches products filtered by tier and updated timestamp for incremental sync.
   */
  static async getProducts(tier: string, updatedSince?: string) {
    const products = await db
      .select({
        p: wholesaleProducts,
        pricing: wholesalePricing,
      })
      .from(wholesaleProducts)
      .leftJoin(
        wholesalePricing,
        and(
          eq(wholesalePricing.productId, wholesaleProducts.id),
          eq(wholesalePricing.tierLabel, tier)
        )
      )
      .where(
        updatedSince
          ? gte(wholesaleProducts.updatedAt, new Date(updatedSince))
          : undefined
      );

    return products.map(({ p, pricing }: { p: any, pricing: any }) => ({
      id: p.id,
      sku: p.sku,
      title: p.title,
      unitPrice: pricing ? parseFloat(pricing.unitPrice) : parseFloat(p.cost),
      availableStock: 0, // Filled by getInventory if needed, or joined below
    }));
  }

  /**
   * Calculates safe stock available for a list of SKUs.
   */
  static async getInventory(skus: string[]) {
    const results = await db
      .select({
        sku: wholesaleProducts.sku,
        quantity: wholesaleInventory.quantityAvailable,
        buffer: wholesaleInventory.safetyStockThreshold,
      })
      .from(wholesaleInventory)
      .innerJoin(wholesaleProducts, eq(wholesaleProducts.id, wholesaleInventory.productId))
      .where(sql`sku IN ${skus}`);

    return results.map((r: any) => ({
      sku: r.sku,
      available: Math.max(0, r.quantity - r.buffer),
    }));
  }

  /**
   * Validates and calculates the final total for an order.
   * Returns total and an array of processed items.
   */
  static async validateOrderItems(tier: string, items: { sku: string; quantity: number; expectedPrice?: number }[]) {
    let total = 0;
    const processed = [];

    for (const item of items) {
      const [product] = await db
        .select({
          p: wholesaleProducts,
          i: wholesaleInventory,
          pr: wholesalePricing,
        })
        .from(wholesaleProducts)
        .innerJoin(wholesaleInventory, eq(wholesaleInventory.productId, wholesaleProducts.id))
        .leftJoin(wholesalePricing, and(
          eq(wholesalePricing.productId, wholesaleProducts.id),
          eq(wholesalePricing.tierLabel, tier)
        ))
        .where(eq(wholesaleProducts.sku, item.sku))
        .limit(1);

      if (!product) throw new Error(`Product ${item.sku} not found`);

      const currentPrice = product.pr ? parseFloat(product.pr.unitPrice) : parseFloat(product.p.cost);

      if (item.expectedPrice !== undefined && Math.abs(currentPrice - item.expectedPrice) > 0.01) {
        throw new Error(`Price mismatch for ${item.sku}. Current: ${currentPrice}`);
      }

      const safeStock = Math.max(0, product.i.quantityAvailable - product.i.safetyStockThreshold);
      if (item.quantity > safeStock) {
        throw new Error(`Insufficient stock for ${item.sku}. Available: ${safeStock}`);
      }

      const lineTotal = currentPrice * item.quantity;
      total += lineTotal;
      processed.push({ ...product.p, quantity: item.quantity, unitPrice: currentPrice, lineTotal });
    }

    return { total, processed };
  }
}
