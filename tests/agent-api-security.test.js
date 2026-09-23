const request = require('supertest');
const { createServer } = require('http');
const { parse } = require('url');
const { handleAgentContent } = require('../pages/api/agent/content');
const { handleAgentSearch } = require('../pages/api/agent/search');

// Minimal Next.js API mock
function createMockNextApi(handler) {
  return async (req, res) => {
    const nextReq = {
      method: req.method,
      headers: req.headers,
      query: parse(req.url || '/', true).query,
    };
    const nextRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((data) => {
        res.status(nextRes.status.mock.calls[0]?.[0] || 200).json(data);
        return nextRes;
      }),
      setHeader: jest.fn().mockImplementation((k, v) => {
        res.setHeader(k, v);
        return nextRes;
      }),
    };
    await handler(nextReq, nextRes);
  };
}

describe('Agent API Security', () => {
  const allowedOrigin = 'https://www.displaycellpros.com';

  describe('Agent Content Route', () => {
    test('rejects unapproved origin', async () => {
      const req = { 
        method: 'GET', 
        headers: { origin: 'https://attacker.com' }, 
        url: '/api/agent/content?id=123' 
      };
      const res = { 
        setHeader: jest.fn(), 
        status: jest.fn().mockReturnThis(), 
        json: jest.fn() 
      };
      
      await handleAgentContent(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('bounds input length for content ID', async () => {
      const req = { 
        method: 'GET', 
        headers: { origin: allowedOrigin }, 
        query: { id: 'a'.repeat(1000) } 
      };
      const res = { 
        setHeader: jest.fn(), 
        status: jest.fn().mockReturnThis(), 
        json: jest.fn() 
      };
      
      await handleAgentContent(req, res);
      // Should not crash and should bound the ID used in internal calls
      expect(res.status).not.toHaveBeenCalledWith(500);
    });
  });

  describe('Agent Search Route', () => {
    test('rejects unapproved origin', async () => {
      const req = { 
        method: 'POST', 
        headers: { origin: 'https://attacker.com' }, 
        body: { query: 'test' } 
      };
      const res = { 
        setHeader: jest.fn(), 
        status: jest.fn().mockReturnThis(), 
        json: jest.fn() 
      };
      
      await handleAgentSearch(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('bounds search query and first parameter', async () => {
      const req = { 
        method: 'POST', 
        headers: { origin: allowedOrigin }, 
        body: { query: 'a'.repeat(1000), first: 999999 } 
      };
      const res = { 
        setHeader: jest.fn(), 
        status: jest.fn().mockReturnThis(), 
        json: jest.fn() 
      };
      
      await handleAgentSearch(req, res);
      expect(res.status).not.toHaveBeenCalledWith(500);
    });
  });
});
