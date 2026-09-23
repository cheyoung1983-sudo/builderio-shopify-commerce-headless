const { getSiteUrl } = require('../services/shopify-customer-account');

describe('Customer Account Origin Resolution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('prioritizes NEXT_PUBLIC_SITE_URL over forwarded headers', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://canonical.com';
    const req = { 
      headers: { 
        'x-forwarded-host': 'attacker.com',
        'host': 'canonical.com' 
      } 
    };
    expect(getSiteUrl(req)).toBe('https://canonical.com');
  });

  test('rejects untrusted forwarded host when TRUSTED_PROXY is not enabled', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const req = { 
      headers: { 
        'x-forwarded-host': 'attacker.com',
        'host': 'displaycellpros.com' 
      } 
    };
    // Should fall back to the actual host header or default
    expect(getSiteUrl(req)).not.toBe('https://attacker.com');
  });

  test('allows forwarded host when TRUSTED_PROXY is enabled', () => {
    process.env.TRUSTED_PROXY = 'true';
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const req = { 
      headers: { 
        'x-forwarded-host': 'dev.local',
        'host': 'displaycellpros.com' 
      } 
    };
    expect(getSiteUrl(req)).toBe('https://dev.local');
  });

  test('enforces https in production', () => {
    process.env.NODE_ENV = 'production';
    const req = { 
      headers: { 
        'x-forwarded-proto': 'http',
        'host': 'displaycellpros.com' 
      } 
    };
    // Should force https even if header says http
    expect(getSiteUrl(req)).toContain('https://');
  });
});
