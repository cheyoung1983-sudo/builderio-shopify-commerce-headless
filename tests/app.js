const express = require('express');
const app = express();
app.use(express.json());

// Mock Next.js response object to satisfy handler expectations
const createNextResponse = (res) => {
  const response = {
    status: (code) => {
      res.status(code);
      return response;
    },
    json: (data) => {
      res.json(data);
      return response;
    },
    setHeader: (name, value) => {
      res.setHeader(name, value);
      return response;
    },
  };
  return response;
};

// Import handlers
// Note: Since we are in a CJS test environment, we use require.
// The handlers are exported as 'default' from the TS files.
const productsHandler = require('../pages/api/v1/wholesale/products/index').default;
const ordersHandler = require('../pages/api/v1/wholesale/orders/index').default;

app.get('/api/v1/wholesale/products', async (req, res) => {
  await productsHandler(req, createNextResponse(res));
});

app.post('/api/v1/wholesale/orders', async (req, res) => {
  await ordersHandler(req, createNextResponse(res));
});

module.exports = app;
