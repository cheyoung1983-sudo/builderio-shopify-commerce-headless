/**
 * @jest-environment node
 */
const request = require('supertest');
const { db } = require('@lib/db');
const { wholesaleAccounts, wholesaleProducts, wholesaleInventory } = require('@lib/db/schema/wholesale');
const { eq } = require('drizzle-orm');
const app = require('./app');
const { createFirebaseJwtMock } = require('./helpers/firebase-jwt-mock');

describe('Wholesale API End-to-End & Strict Owner Security', () => {
  const jwtMock = createFirebaseJwtMock('dcpllcrev4');
  const PERSONAL_OWNER_TOKEN = jwtMock.signIdToken({ email: 'cheyoung1983@gmail.com', email_verified: true });
  const BUSINESS_OWNER_TOKEN = jwtMock.signIdToken({ email: 'ryan@displaycellpros.com', email_verified: true });
  const UNVERIFIED_OWNER_TOKEN = jwtMock.signIdToken({ email: 'ryan@displaycellpros.com', email_verified: false });
  const OUTSIDER_TOKEN = jwtMock.signIdToken({ email: 'outsider@example.com', email_verified: true });

  let testSku = 'TEST-SKU-001';
  let dbAvailable = true;
  let originalFetch;

  beforeAll(async () => {
    originalFetch = global.fetch;
    global.fetch = async (u, init) => {
      if (String(u).includes('securetoken@system.gserviceaccount.com')) {
        return {
          ok: true,
          headers: { get: () => 'public, max-age=3600' },
          json: async () => jwtMock.certsPayload,
        };
      }
      return originalFetch(u, init);
    };

    try {
      await db.insert(wholesaleAccounts).values({
        partnerName: 'DisplayCellPros Verified Owner',
        email: 'ryan@displaycellpros.com',
        isVerified: true,
        pricingTier: 'VIP',
      }).returning();

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
    } catch (err) {
      dbAvailable = false;
      console.warn('Skipping wholesale DB integration assertions due to DB connection failure:', err.message);
    }
  });

  afterAll(async () => {
    if (originalFetch) {
      global.fetch = originalFetch;
    }
    if (!dbAvailable) return;
    try {
      await db.delete(wholesaleInventory);
      await db.delete(wholesaleProducts);
      await db.delete(wholesaleAccounts);
    } catch {
      // ignore cleanup errors if db unavailable
    }
  });

  describe('Strict Fail-Closed Owner Authentication', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/wholesale/products');
      expect(res.status).toBe(401);
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('rejects legacy X-API-Key and spoofed preview/admin headers with 401', async () => {
      const apiKeyRes = await request(app)
        .get('/api/v1/wholesale/products')
        .set('X-API-Key', 'pk_test_123.test-secret-1234567890');
      expect(apiKeyRes.status).toBe(401);

      const spoofRes = await request(app)
        .post('/api/v1/wholesale/orders')
        .set('x-staff-preview', 'true')
        .set('x-admin-email', 'ryan@displaycellpros.com')
        .set('x-user-email', 'cheyoung1983@gmail.com')
        .send({ items: [{ sku: testSku, quantity: 1 }] });
      expect(spoofRes.status).toBe(401);
    });

    it('rejects non-allowlisted users and unverified owner tokens with 401', async () => {
      const outsiderRes = await request(app)
        .get('/api/v1/wholesale/products')
        .set('Authorization', `Bearer ${OUTSIDER_TOKEN}`);
      expect(outsiderRes.status).toBe(401);

      const unverifiedRes = await request(app)
        .get('/api/v1/wholesale/products')
        .set('Authorization', `Bearer ${UNVERIFIED_OWNER_TOKEN}`);
      expect(unverifiedRes.status).toBe(401);
    });

    it('authenticates verified owner emails (cheyoung1983@gmail.com & ryan@displaycellpros.com)', async () => {
      const personalRes = await request(app)
        .post('/api/v1/wholesale/orders')
        .set('Authorization', `Bearer ${PERSONAL_OWNER_TOKEN}`)
        .send({});
      // Passes auth middleware and reaches validation (400 Bad Request, not 401)
      expect(personalRes.status).toBe(400);

      const businessRes = await request(app)
        .post('/api/v1/wholesale/orders')
        .set('Authorization', `Bearer ${BUSINESS_OWNER_TOKEN}`)
        .send({});
      expect(businessRes.status).toBe(400);

      if (dbAvailable) {
        const productsRes = await request(app)
          .get('/api/v1/wholesale/products')
          .set('Authorization', `Bearer ${BUSINESS_OWNER_TOKEN}`);
        expect(productsRes.status).toBe(200);
        expect(productsRes.body.success).toBe(true);
      }
    });
  });

  describe('Order Idempotency & Inventory', () => {
    it('should create an order and deduct stock for verified owner', async () => {
      if (!dbAvailable) return;
      const orderPayload = {
        items: [{ sku: testSku, quantity: 10 }],
        shipping_address: { city: 'Test City', country: 'USA' },
      };
      const idempotencyKey = 'idemp-123';

      const res = await request(app)
        .post('/api/v1/wholesale/orders')
        .set('Authorization', `Bearer ${BUSINESS_OWNER_TOKEN}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(orderPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const [inv] = await db.select().from(wholesaleInventory).where(eq(wholesaleProducts.sku, testSku));
      expect(parseInt(inv.quantityAvailable)).toBe(90);
    });

    it('should return cached response for same idempotency key', async () => {
      if (!dbAvailable) return;
      const orderPayload = {
        items: [{ sku: testSku, quantity: 1 }],
        shipping_address: { city: 'Test City', country: 'USA' },
      };
      const idempotencyKey = 'idemp-same';

      await request(app)
        .post('/api/v1/wholesale/orders')
        .set('Authorization', `Bearer ${PERSONAL_OWNER_TOKEN}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(orderPayload);

      const res = await request(app)
        .post('/api/v1/wholesale/orders')
        .set('Authorization', `Bearer ${PERSONAL_OWNER_TOKEN}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(orderPayload);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('idempotency cache');
    });
  });
});
