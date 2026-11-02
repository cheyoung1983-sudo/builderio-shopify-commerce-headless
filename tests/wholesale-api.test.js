const request = require('supertest');
const { db } = require('@lib/db');
const { wholesaleAccounts, wholesaleApiKeys, wholesaleProducts, wholesaleInventory } = require('@lib/db/schema/wholesale');
const { eq } = require('drizzle-orm');
const app = require('./app'); // Assuming an express-like entry point for the Next.js API routes or a mock app

describe('Wholesale API End-to-End Integration', () => {
  let testApiKey;
  let testPartnerUid;
  let testSku = 'TEST-SKU-001';

  beforeAll(async () => {
    // 1. Setup Test Partner Account
    const [partner] = await db.insert(wholesaleAccounts).values({
      partnerName: 'Test Partner',
      email: 'test@partner.com',
      isVerified: true,
      pricingTier: 'STANDARD',
    }).returning();
    testPartnerUid = partner.uid;

    // 2. Setup API Key
    const prefix = 'pk_test_123';
    const secret = 'test-secret-1234567890';
    const hashedSecret = require('crypto').createHash('sha256').update(secret).digest('hex');

    await db.insert(wholesaleApiKeys).values({
      accountUid: testPartnerUid,
      keyPrefix: prefix,
      hashedSecret: hashedSecret,
      status: 'active',
    });
    testApiKey = `${prefix}.${secret}`;

    // 3. Setup Test Product & Inventory
    const [product] = await db.insert(wholesaleProducts).values({
      sku: testSku,
      title: 'Integration Test Widget',
      cost: 10.00,
      isActive: true,
    }).returning();

    await db.insert(wholesaleInventory).values({
      productId: product.id,
      quantityAvailable: 100,
      safetyStockThreshold: 5,
    });
  });

  afterAll(async () => {
    await db.delete(wholesaleInventory);
    await db.delete(wholesaleProducts);
    await db.delete(wholesaleApiKeys);
    await db.delete(wholesaleAccounts);
  });

  describe('Authentication', () => {
    it('should reject requests without X-API-Key', async () => {
      const res = await request(app).get('/api/v1/wholesale/products');
      expect(res.status).toBe(401);
    });

    it('should reject invalid API keys', async () => {
      const res = await request(app)
        .get('/api/v1/wholesale/products')
        .set('X-API-Key', 'pk_invalid.secret');
      expect(res.status).toBe(401);
    });

    it('should allow requests with valid API key', async () => {
      const res = await request(app)
        .get('/api/v1/wholesale/products')
        .set('X-API-Key', testApiKey);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Order Idempotency & Inventory', () => {
    it('should create an order and deduct stock', async () => {
      const orderPayload = {
        items: [{ sku: testSku, quantity: 10 }],
        shipping_address: { city: 'Test City', country: 'USA' },
      };
      const idempotencyKey = 'idemp-123';

      const res = await request(app)
        .post('/api/v1/wholesale/orders')
        .set('X-API-Key', testApiKey)
        .set('Idempotency-Key', idempotencyKey)
        .send(orderPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify stock deduction (100 - 10 = 90)
      const [inv] = await db.select().from(wholesaleInventory).where(eq(wholesaleProducts.sku, testSku));
      expect(parseInt(inv.quantityAvailable)).toBe(90);
    });

    it('should return cached response for same idempotency key', async () => {
      const orderPayload = {
        items: [{ sku: testSku, quantity: 1 }],
        shipping_address: { city: 'Test City', country: 'USA' },
      };
      const idempotencyKey = 'idemp-same';

      // First request
      await request(app)
        .post('/api/v1/wholesale/orders')
        .set('X-API-Key', testApiKey)
        .set('Idempotency-Key', idempotencyKey)
        .send(orderPayload);

      // Second request
      const res = await request(app)
        .post('/api/v1/wholesale/orders')
        .set('X-API-Key', testApiKey)
        .set('Idempotency-Key', idempotencyKey)
        .send(orderPayload);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('idempotency cache');
    });
  });
});
