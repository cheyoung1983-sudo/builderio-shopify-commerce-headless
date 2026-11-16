import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  numeric,
  integer,
  jsonb,
  uniqueIndex,
  index,
  primaryKey
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Wholesale Accounts
 * Links users/partners to their Tribal ID verification status.
 */
export const wholesaleAccounts = pgTable('wholesale_accounts', {
  uid: uuid('uid').primaryKey().defaultRandom(),
  partnerName: varchar('partner_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  tribalId: varchar('tribal_id', { length: 100 }),
  isVerified: boolean('is_verified').default(false),
  pricingTier: varchar('pricing_tier', { length: 50 }).default('STANDARD'), // STANDARD, BRONZE, SILVER, VIP
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * API Keys for Wholesale Partners
 * Secrets are stored as SHA-256 hashes.
 */
export const wholesaleApiKeys = pgTable('wholesale_api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountUid: uuid('account_uid').references(() => wholesaleAccounts.uid).notNull(),
  keyPrefix: varchar('key_prefix', { length: 12 }).notNull().unique(), // e.g., pk_live_abc123
  hashedSecret: varchar('hashed_secret', { length: 64 }).notNull(),
  status: varchar('status', { length: 20 }).default('active'), // active, revoked
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Wholesale Product Mirror
 * Mirrors Shopify products with wholesale-specific cost and MAP data.
 */
export const wholesaleProducts = pgTable('wholesale_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  sku: varchar('sku', { length: 64 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  cost: numeric('cost', { precision: 10, scale: 2 }).notNull(),
  map: numeric('map', { precision: 10, scale: 2 }), // Minimum Advertised Price
  isActive: boolean('is_active').default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Tiered Pricing
 */
export const wholesalePricing = pgTable('wholesale_pricing', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => wholesaleProducts.id).notNull(),
  tierLabel: varchar('tier_label', { length: 50 }).notNull(), // STANDARD, BRONZE, etc.
  minQuantity: integer('min_quantity').default(1),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Real-Time Inventory
 */
export const wholesaleInventory = pgTable('wholesale_inventory', {
  productId: uuid('product_id').primaryKey().references(() => wholesaleProducts.id),
  quantityAvailable: integer('quantity_available').notNull().default(0),
  safetyStockThreshold: integer('safety_stock_threshold').notNull().default(5),
  warehouseCode: varchar('warehouse_code', { length: 32 }).default('MAIN'),
  lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
});

/**
 * Wholesale Orders
 */
export const wholesaleOrders = pgTable('wholesale_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountUid: uuid('account_uid').references(() => wholesaleAccounts.uid).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 32 }).default('PENDING'), // PENDING, CONFIRMED, SHIPPED, CANCELLED
  shippingAddress: jsonb('shipping_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  unq_partner_idempotency: uniqueIndex('unq_partner_idempotency').on(table.accountUid, table.idempotencyKey),
}));

/**
 * Wholesale Order Items
 */
export const wholesaleOrderItems = pgTable('wholesale_order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => wholesaleOrders.id).notNull(),
  productId: uuid('product_id').references(() => wholesaleProducts.id),
  sku: varchar('sku', { length: 64 }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric('line_total', { precision: 10, scale: 2 }).notNull(),
});

/**
 * Ingestion Logs
 */
export const wholesaleIngestionLogs = pgTable('wholesale_ingestion_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierName: varchar('supplier_name', { length: 100 }).notNull(),
  totalRowsProcessed: integer('total_rows_processed').default(0),
  success: boolean('success').default(false),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Webhook Logs
 */
export const wholesaleWebhooks = pgTable('wholesale_webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountUid: uuid('account_uid').references(() => wholesaleAccounts.uid).notNull(),
  eventType: varchar('event_type', { length: 64 }).notNull(),
  payload: jsonb('payload').notNull(),
  responseStatus: integer('response_status'),
  success: boolean('success').default(false),
  attemptCount: integer('attempt_count').default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
