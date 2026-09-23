const { 
  isAllowedOrigin, 
  applyCors, 
  handleOptions, 
  createRateLimiter, 
  readBoundedString, 
  readBoundedInteger 
} = require('../lib/api-security/index');

describe('API Security Utility', () => {
  const allowedOrigins = ['https://www.displaycellpros.com', 'https://displaycellpros.com'];

  describe('isAllowedOrigin', () => {
    test('accepts exact configured origin', () => {
      expect(isAllowedOrigin('https://www.displaycellpros.com', { allowedOrigins })).toBe(true);
      expect(isAllowedOrigin('https://displaycellpros.com', { allowedOrigins })).toBe(true);
    });

    test('rejects lookalikes and substrings', () => {
      expect(isAllowedOrigin('https://www.displaycellpros.com.attacker.test', { allowedOrigins })).toBe(false);
      expect(isAllowedOrigin('https://attacker.com/www.displaycellpros.com', { allowedOrigins })).toBe(false);
    });

    test('handles localhost/run-app development origins', () => {
      const localOrigin = 'http://localhost:3000';
      expect(isAllowedOrigin(localOrigin, { allowedOrigins, allowLocalhost: true })).toBe(true);
      expect(isAllowedOrigin(localOrigin, { allowedOrigins, allowLocalhost: false })).toBe(false);
    });
  });

  describe('CORS Helpers', () => {
    let mockRes;
    beforeEach(() => {
      mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    test('applyCors sets correct headers for allowed origin', () => {
      const origin = 'https://www.displaycellpros.com';
      applyCors(mockRes, origin, { allowedOrigins });
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', origin);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Vary', 'Origin');
    });

    test('applyCors does not set origin header for disallowed origin', () => {
      const origin = 'https://attacker.com';
      applyCors(mockRes, origin, { allowedOrigins });
      expect(mockRes.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.any(String));
    });

    test('handleOptions returns true and sends 204 for valid preflight', () => {
      const mockReq = { method: 'OPTIONS', headers: { origin: 'https://www.displaycellpros.com' } };
      const handled = handleOptions(mockReq, mockRes, { allowedOrigins });
      expect(handled).toBe(true);
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });
  });

  describe('Input Bounding', () => {
    test('readBoundedString truncates long strings', () => {
      const input = 'a'.repeat(1000);
      const result = readBoundedString(input, { maxLength: 100 });
      expect(result).toHaveLength(100);
      expect(result).toBe(input.substring(0, 100));
    });

    test('readBoundedInteger clamps values', () => {
      expect(readBoundedInteger('1000', { min: 1, max: 100 })).toBe(100);
      expect(readBoundedInteger('-5', { min: 1, max: 100 })).toBe(1);
      expect(readBoundedInteger('50', { min: 1, max: 100 })).toBe(50);
    });
  });

  describe('Rate Limiter', () => {
    test('throttles repeated requests for the same key', () => {
      const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 2 });
      const key = 'user-1';
      
      expect(limiter.check(key).allowed).toBe(true);
      expect(limiter.check(key).allowed).toBe(true);
      const throttled = limiter.check(key);
      expect(throttled.allowed).toBe(false);
      expect(throttled.retryAfterSeconds).toBeGreaterThan(0);
    });

    test('allows different keys independently', () => {
      const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1 });
      expect(limiter.check('user-1').allowed).toBe(true);
      expect(limiter.check('user-2').allowed).toBe(true);
    });
  });
});
