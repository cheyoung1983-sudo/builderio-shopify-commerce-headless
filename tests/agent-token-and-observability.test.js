const { 
  isAllowedOrigin, 
  applyCors, 
  handleOptions, 
  createRateLimiter, 
  readBoundedString, 
  readBoundedInteger 
} = require('../lib/api-security/index');

// Mock handlers for testing
const { default: tokenHandler } = require('../pages/api/agent/token');
const { default: signedUrlHandler } = require('../pages/api/agent/signed-url');
const { default: logHandler } = require('../pages/api/observability/log');

describe('Agent Tokens & Observability Security', () => {
  const allowedOrigin = 'https://www.displaycellpros.com';

  const createMockRes = () => ({
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  });

  describe('ElevenLabs Token Routes', () => {
    test('rejects arbitrary .run.app origins in production', async () => {
      const req = { 
        method: 'POST', 
        headers: { origin: 'https://attacker.run.app' }, 
        body: { agentId: 'test' } 
      };
      const res = createMockRes();
      
      await tokenHandler(req, res);
      // Expectation: It should NOT set Access-Control-Allow-Origin to the attacker origin
      expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://attacker.run.app');
    });

    test('rejects substring localhost origins', async () => {
      const req = { 
        method: 'POST', 
        headers: { origin: 'https://attacker.com?q=localhost' }, 
        body: { agentId: 'test' } 
      };
      const res = createMockRes();
      
      await tokenHandler(req, res);
      expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://attacker.com?q=localhost');
    });

    test('bounds and validates agentId', async () => {
      const req = { 
        method: 'POST', 
        headers: { origin: allowedOrigin }, 
        body: { agentId: 'a'.repeat(1000) } 
      };
      const res = createMockRes();
      
      await tokenHandler(req, res);
      // The internal call should have a bounded agentId
      expect(res.status).not.toHaveBeenCalledWith(500);
    });
  });

  describe('Observability Log Route', () => {
    test('rejects wildcard CORS', async () => {
      const req = { 
        method: 'POST', 
        headers: { origin: 'https://attacker.com' }, 
        body: { message: 'test' } 
      };
      const res = createMockRes();
      
      await logHandler(req, res);
      expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    });

    test('bounds massive observability payloads', async () => {
      const req = { 
        method: 'POST', 
        headers: { origin: allowedOrigin }, 
        body: { 
          message: 'a'.repeat(10000),
          stack: 's'.repeat(10000),
          metadata: { data: 'm'.repeat(10000) }
        } 
      };
      const res = createMockRes();
      
      await logHandler(req, res);
      // Should handle gracefully without crashing
      expect(res.status).not.toHaveBeenCalledWith(500);
    });

    test('omits structured entry in production', async () => {
      process.env.NODE_ENV = 'production';
      const req = { 
        method: 'POST', 
        headers: { origin: allowedOrigin }, 
        body: { message: 'test' } 
      };
      const res = createMockRes();
      
      await logHandler(req, res);
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.entry).toBeUndefined();
      process.env.NODE_ENV = 'development'; // reset
    });
  });
});
