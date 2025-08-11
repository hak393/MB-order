// src/component/SellOrder.jsx
import React, { useEffect, useState } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import './Style.css';

const firebaseConfig = { databaseURL: 'https://mb-order-3764e-default-rtdb.firebaseio.com/' };
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

const SellOrder = () => {
  const [sellOrders, setSellOrders] = useState([]);

  useEffect(() => {
    const sellOrdersRef = ref(db, 'sellOrders');
    return onValue(sellOrdersRef, (snap) => {
      const data = snap.val();
      const formatted = data
        ? Object.keys(data).map((key) => ({ id: key, ...data[key] }))
        : [];
      // Sort by newest first
      formatted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setSellOrders(formatted);
    });
  }, []);

  return (
    <div className="orderpage-container">
      <h2 style={{ textAlign: 'center' }}>SELL ORDERS</h2>
      {sellOrders.length === 0 ? (
        <p style={{ textAlign: 'center' }}>No sell orders found.</p>
      ) : (
        sellOrders.map((order) => (
          <div key={order.id} className="order-card new">
            <div className="order-header">
              <div>
                <strong>User:</strong> {order.user} <br />
                <strong>Customer:</strong> {order.customerName} <br />
                <strong>City:</strong> {order.city} <br />
                <strong>Sold On:</strong> {new Date(order.timestamp).toLocaleString()}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Original Qty</th>
                  <th>Sold Qty</th>
                  <th>Weight</th>
                  <th>Less</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.productName}</td>
                    <td>
                      {item.originalQty} {item.unit}
                    </td>
                    <td>
                      {item.soldQty || item.originalQty} {item.unit}
                    </td>
                    <td>{item.weight || '-'}</td>
                    <td>{item.less || '-'}</td>
                    <td>₹{item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
};

export default SellOrder;
