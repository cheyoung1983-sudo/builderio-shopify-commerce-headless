const { isAllowedOrigin, applyCors, handleOptions, createRateLimiter, readBoundedString, readBoundedInteger } = require('../lib/api-security/index');

describe('API Security Utility', () => {
  const allowedOrigins = ['https://www.displaycellpros.com', 'https://displaycellpros.com'];

  describe('isAllowedOrigin', () => {
    test('accepts exact configured origin', () => {
      expect(isAllowedOrigin('https://www.displaycellpros.com', { allowedOrigins })).toBe(true);
    });

    test('rejects lookalike origins', () => {
      expect(isAllowedOrigin('https://www.displaycellpros.com.attacker.test', { allowedOrigins })).toBe(false);
    });

    test('rejects null or undefined origin', () => {
      expect(isAllowedOrigin(undefined, { allowedOrigins })).toBe(false);
    });

    test('allows localhost when enabled', () => {
      expect(isAllowedOrigin('http://localhost:3000', { allowedOrigins, allowLocalhost: true })).toBe(true);
    });

    test('rejects localhost when disabled', () => {
      expect(isAllowedOrigin('http://localhost:3000', { allowedOrigins, allowLocalhost: false })).toBe(false);
    });
  });

  describe('applyCors', () => {
    test('sets Access-Control-Allow-Origin for approved origin', () => {
      const res = { setHeader: jest.fn() };
      applyCors(res, 'https://www.displaycellpros.com', { allowedOrigins });
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://www.displaycellpros.com');
      expect(res.setHeader).toHaveBeenCalledWith('Vary', 'Origin');
    });

    test('does not set origin header for unapproved origin', () => {
      const res = { setHeader: jest.fn() };
      applyCors(res, 'https://attacker.com', { allowedOrigins });
      expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.any(String));
    });
  });

  describe('handleOptions', () => {
    test('returns true and sets headers for valid preflight', () => {
      const req = { method: 'OPTIONS', headers: { origin: 'https://www.displaycellpros.com' } };
      const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
      const handled = handleOptions(req, res, { allowedOrigins });
      expect(handled).toBe(true);
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('createRateLimiter', () => {
    test('allows requests within limit and rejects when exceeded', () => {
      const limiter = createRateLimiter({ windowMs: 1000, limit: 2 });
      const key = 'test-client';
      expect(limiter.check(key).allowed).toBe(true);
      expect(limiter.check(key).allowed).toBe(true);
      expect(limiter.check(key).allowed).toBe(false);
    });

    test('uses separate keys for different clients', () => {
      const limiter = createRateLimiter({ windowMs: 1000, limit: 1 });
      expect(limiter.check('client-a').allowed).toBe(true);
      expect(limiter.check('client-b').allowed).toBe(true);
    });
  });

  describe('Input Bounding', () => {
    test('readBoundedString truncates oversized strings', () => {
      const input = 'a'.repeat(100);
      expect(readBoundedString(input, { maxLength: 10 })).toBe('a'.repeat(10));
    });

    test('readBoundedInteger clamps values', () => {
      expect(readBoundedInteger('100', { min: 1, max: 50 })).toBe(50);
      expect(readBoundedInteger('-10', { min: 1, max: 50 })).toBe(1);
      expect(readBoundedInteger('25', { min: 1, max: 50 })).toBe(25);
    });
  });
});
