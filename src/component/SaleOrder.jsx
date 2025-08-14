// src/component/SellOrder.jsx
import React, { useEffect, useState, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import './Style.css';

const firebaseConfig = { databaseURL: 'https://mb-order-3764e-default-rtdb.firebaseio.com/' };
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

const SellOrder = () => {
  const [sellOrders, setSellOrders] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const printRefs = useRef({});

  useEffect(() => {
    const sellOrdersRef = ref(db, 'sellOrders');
    return onValue(sellOrdersRef, (snap) => {
      const data = snap.val();
      const formatted = data
        ? Object.keys(data).map((key) => ({ id: key, ...data[key] }))
        : [];

      // Sort by timestamp ascending to assign sequential challan numbers
      formatted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Assign challan number sequentially per month
      const monthMap = {}; // "YYYY-MM" => count
      const withChallan = formatted.map((order) => {
        const date = new Date(order.timestamp);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        monthMap[monthKey] = (monthMap[monthKey] || 0) + 1;
        const challanNo = monthMap[monthKey].toString().padStart(2, '0');
        return { ...order, challanNo };
      });

      // Sort back descending for display
      withChallan.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setSellOrders(withChallan);
    });
  }, []);

  const handlePrint = (id) => {
    const content = printRefs.current[id];
    if (!content) return;

    const printWindow = window.open('', '', 'width=900,height=650');
    printWindow.document.write(`
      <html>
        <head>
          <title>Sell Order</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f4f4f4; }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setEditItems(order.items.map(item => ({ ...item })));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...editItems];
    updated[index][field] = value;
    setEditItems(updated);
  };

  const handleSave = () => {
    if (!editingOrder) return;
    const orderRef = ref(db, `sellOrders/${editingOrder.id}`);
    update(orderRef, { items: editItems }).then(() => {
      setEditingOrder(null);
      setEditItems([]);
    });
  };

  const handleCancel = () => {
    setEditingOrder(null);
    setEditItems([]);
  };

  // Filter orders by selected date
  const filteredOrders = sellOrders.filter(order => {
    const orderDate = new Date(order.timestamp).toISOString().slice(0, 10);
    return orderDate === selectedDate;
  });

  return (
    <div className="orderpage-container">
      <h2 style={{ textAlign: 'center' }}>SELL ORDERS</h2>

      {/* Date picker */}
      {/* Date picker */}
<div className="date-picker-container">
  <label>Select Date:</label>
  <input
    type="date"
    value={selectedDate}
    onChange={(e) => setSelectedDate(e.target.value)}
  />
</div>


      {filteredOrders.length === 0 ? (
        <p style={{ textAlign: 'center' }}>No sell orders found for selected date.</p>
      ) : (
        filteredOrders.map((order) => (
          <div key={order.id} className="order-card new">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                CHALLAN NO. : {order.challanNo}
              </div>
              <div>
                <button
                  style={{ background: 'blue', color: 'white', marginRight: '8px', padding: '5px 10px' }}
                  onClick={() => handleEdit(order)}
                >
                  Edit
                </button>
                <button
                  style={{ background: 'green', color: 'white', padding: '5px 10px' }}
                  onClick={() => handlePrint(order.id)}
                >
                  Print
                </button>
              </div>
            </div>

            <div ref={(el) => (printRefs.current[order.id] = el)}>
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
                      <td>{item.originalQty} {item.unit}</td>
                      <td>{item.soldQty || item.originalQty} {item.unit}</td>
                      <td>{item.weight || '-'}</td>
                      <td>{item.less || '-'}</td>
                      <td>₹{item.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* Full Screen Edit Overlay */}
      {editingOrder && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          zIndex: 9999,
          overflowY: 'auto',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            color: 'black',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '100%',
            margin: 'auto',
            overflowX: 'auto'
          }}>
            <h2>Edit Items for {editingOrder.customerName}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
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
                {editItems.map((item, idx) => (
                  <tr key={idx}>
                    <td><input value={item.productName} onChange={(e) => handleItemChange(idx, 'productName', e.target.value)} /></td>
                    <td><input type="number" value={item.originalQty} onChange={(e) => handleItemChange(idx, 'originalQty', e.target.value)} /></td>
                    <td><input type="number" value={item.soldQty || ''} onChange={(e) => handleItemChange(idx, 'soldQty', e.target.value)} /></td>
                    <td><input value={item.weight || ''} onChange={(e) => handleItemChange(idx, 'weight', e.target.value)} /></td>
                    <td><input value={item.less || ''} onChange={(e) => handleItemChange(idx, 'less', e.target.value)} /></td>
                    <td><input type="number" value={item.price} onChange={(e) => handleItemChange(idx, 'price', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button style={{ background: 'gray', color: 'white', padding: '8px 15px', marginRight: '10px' }} onClick={handleCancel}>Cancel</button>
              <button style={{ background: 'green', color: 'white', padding: '8px 15px' }} onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SellOrder;
