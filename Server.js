const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const ordersFile = path.join(__dirname, 'orders.json');

// Helper: read all orders from JSON file
const readOrders = () => {
  try {
    if (!fs.existsSync(ordersFile)) {
      fs.writeFileSync(ordersFile, '{}', 'utf-8');
      return {};
    }
    const data = fs.readFileSync(ordersFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading orders.json:', error);
    return {};
  }
};

// Helper: write all orders to JSON file
const writeOrders = (orders) => {
  try {
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing orders.json:', error);
  }
};

// Save or update orders for a user and customer
app.post('/save-orders', (req, res) => {
  const { user, customer, order } = req.body;

  if (!user || !customer || !order) {
    return res.status(400).json({ error: 'Missing user, customer, or order data' });
  }

  const allOrders = readOrders();

  if (!allOrders[user]) {
    allOrders[user] = {};
  }

  allOrders[user][customer] = order;

  writeOrders(allOrders);

  res.status(200).json({ message: 'Order saved successfully' });
});

// Get all orders for a given user
app.get('/get-orders', (req, res) => {
  const user = req.query.user;
  if (!user) {
    return res.status(400).json({ error: 'Missing user query parameter' });
  }

  const allOrders = readOrders();

  const userOrders = allOrders[user] || {};

  res.json(userOrders);
});

app.listen(PORT, '0.0.0.0',() => {
  console.log(`Server listening on port ${PORT}`);
});
