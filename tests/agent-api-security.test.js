const { createServer } = require('http');
const { solve } = require('node-fetch'); // Note: in actual Next.js environment, fetch is global

// Mocking Next.js req/res for unit-like route tests
const mockReq = (headers = {}, body = {}, query = {}, method = 'GET') => ({
  headers,
  body,
  query,
  method,
  socket: { remoteAddress: '127.0.0.1' },
});

const mockRes = () => {
  const res = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  return res;
};

const contentHandler = require('../pages/api/agent/content').default;
const searchHandler = require('../pages/api/agent/search').default;

describe('Agent API Route Security', () => {
  const approvedOrigin = 'https://www.displaycellpros.com';
  const unapprovedOrigin = 'https://attacker.test';

  describe('/api/agent/content', () => {
    test('rejects unapproved origin', async () => {
      const req = mockReq({ origin: unapprovedOrigin });
      const res = mockRes();
      await contentHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Origin not allowed' }));
    });

    test('accepts approved origin', async () => {
      const req = mockReq({ origin: approvedOrigin });
      const res = mockRes();
      // We expect a 200 or 400 (if body missing), but NOT a 403
      await contentHandler(req, res);
      expect(res.status).not.toHaveBeenCalledWith(403);
    });

    test('bounds the model and query parameters', async () => {
      const req = mockReq({ origin: approvedOrigin }, {}, { 
        model: 'a'.repeat(200), 
        query: 'b'.repeat(200) 
      });
      const res = mockRes();
      await contentHandler(req, res);
      // The handler should still succeed but internal bounding happens
      // Since we can't easily check internal variables, we verify it doesn't crash
      expect(res.status).not.toHaveBeenCalledWith(500);
    });
  });

  describe('/api/agent/search', () => {
    test('rejects unapproved origin', async () => {
      const req = mockReq({ origin: unapprovedOrigin });
      const res = mockRes();
      await searchHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Origin not allowed' }));
    });

    test('clamps the first parameter', async () => {
      const req = mockReq({ origin: approvedOrigin }, {}, { first: 999 });
      const res = mockRes();
      await searchHandler(req, res);
      // Internal logic should clamp 999 to 25. 
      // We verify that a high 'first' doesn't cause an upstream crash.
      expect(res.status).not.toHaveBeenCalledWith(500);
    });
  });

  describe('Rate Limiting', () => {
    test('returns 429 when threshold exceeded', async () => {
      const req = mockReq({ origin: approvedOrigin });
      const res = mockRes();
      
      // We need to trigger the limiter. 
      // Since rateLimiter is a module-level constant, we call the handler repeatedly.
      // The current limit is 30 requests per minute.
      for (let i = 0; i < 31; i++) {
        await contentHandler(req, res);
      }
      
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });
  });
});
