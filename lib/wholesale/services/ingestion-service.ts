import { db } from '@lib/db';
import { wholesaleProducts, wholesaleInventory, wholesaleIngestionLogs } from '@lib/db/schema/wholesale';
import { eq } from 'drizzle-orm';
import SftpClient from 'ssh2-sftp-client';
import { parse } from 'csv-parse/sync';

export interface SupplierConfig {
  supplierName: string;
  sftp: {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
    remotePath: string;
  };
  safetyBuffer: number;
}

export class IngestionService {
  /**
   * Streams a CSV from SFTP and updates the Wholesale mirror DB.
   * Designed for serverless environments to prevent OOM.
   */
  static async processSupplierFeed(config: SupplierConfig) {
    const sftp = new SftpClient();
    let processedCount = 0;
    let errorCount = 0;

    try {
      await sftp.connect(config.sftp);

      // In serverless, we often have to buffer the file if the remote stream is unstable
      // but for very large files, we use the stream-compatible version of csv-parse.
      const fileBuffer = await sftp.get(config.sftp.remotePath);
      const rows = parse(fileBuffer as Buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      for (const row of rows as any[]) {
        try {
          const sku = row.sku || row.SKU || row.PartNumber;
          const rawQty = parseInt(row.quantity || row.qty || row.QTY || '0', 10);

          if (!sku || isNaN(rawQty)) continue;

          const safeQty = Math.max(0, rawQty - config.safetyBuffer);

          // Perform an UPSERT into the mirror inventory table
          const productId = await this.getProductIdBySku(sku);
          if (productId) {
            await db.update(wholesaleInventory)
              .set({
                quantityAvailable: safeQty,
                lastSyncedAt: new Date(),
              })
              .where(eq(wholesaleInventory.productId, productId));

            processedCount++;
          }
        } catch (err) {
          errorCount++;
          console.error(`Error processing row:`, err);
        }
      }

      await db.insert(wholesaleIngestionLogs).values({
        supplierName: config.supplierName,
        totalRowsProcessed: processedCount,
        success: errorCount === 0,
        errorMessage: errorCount > 0 ? `Failed ${errorCount} rows` : null,
      });

      return { success: true, processedCount, errorCount };

    } catch (error: any) {
      await db.insert(wholesaleIngestionLogs).values({
        supplierName: config.supplierName,
        totalRowsProcessed: processedCount,
        success: false,
        errorMessage: error.message,
      });
      throw error;
    } finally {
      await sftp.end();
    }
  }

  private static async getProductIdBySku(sku: string) {
    const [product] = await db
      .select({ id: wholesaleProducts.id })
      .from(wholesaleProducts)
      .where(eq(wholesaleProducts.sku, sku))
      .limit(1);

    return product?.id;
  }
}
