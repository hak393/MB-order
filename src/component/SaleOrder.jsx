import React, { useEffect, useState, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, update, get, remove } from 'firebase/database'; // ⬅ added get
import './Style.css';

const firebaseConfig = { databaseURL: 'https://mb-order-3764e-default-rtdb.firebaseio.com/' };
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

// 🔥 Put helper function here (after db is defined)
const updateProductNameEverywhere = async (productId, newName) => {
  const productsRef = ref(db, `products/${productId}`);

  // 1. Get old name from products
  const snapshot = await get(productsRef);
  if (!snapshot.exists()) return;
  const oldName = snapshot.val().name;

  // 2. Update product name
  await update(productsRef, { name: newName });

  // 3. Update in all sellOrders
  const sellOrdersRef = ref(db, 'sellOrders');
  const sellOrdersSnap = await get(sellOrdersRef);
  if (!sellOrdersSnap.exists()) return;

  const orders = sellOrdersSnap.val();
  Object.keys(orders).forEach(orderId => {
    const order = orders[orderId];
    if (order.items) {
      const updatedItems = order.items.map(item =>
        item.productName === oldName
          ? { ...item, productName: newName }
          : item
      );
      update(ref(db, `sellOrders/${orderId}`), { items: updatedItems });
    }
  });
};

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
      const monthMap = {};
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

  const handlePrint = async (id) => {
    const content = printRefs.current[id];
    if (!content) return;

    // ✅ Extract customer name & city from header
    const headerDiv = content.querySelector(".order-header");
    const headerText = headerDiv.innerHTML
      .replace(/<strong>User:<\/strong>.*?<br\s*\/?>/i, ""); // remove User

    const customerMatch = headerText.match(/<strong>Customer:<\/strong>\s*([^<]+)<br\s*\/?>/i);
    const cityMatch = headerText.match(/<strong>City:<\/strong>\s*([^<]+)<br\s*\/?>/i);

    const customerName = customerMatch ? customerMatch[1].trim() : "";
    const city = cityMatch ? cityMatch[1].trim() : "";

    // ✅ Fetch phone number from Firebase
    let phoneNumber = "-";
    try {
      const customersRef = ref(db, "customers");
      const snap = await get(customersRef);
      if (snap.exists()) {
        const customers = snap.val();
        const found = Object.values(customers).find(
          (c) => c.name === customerName && c.city === city
        );
        if (found?.number) phoneNumber = found.number;
      }
    } catch (err) {
      console.error("Error fetching phone:", err);
    }

    // ✅ Insert phone after city
    let headerHTML = headerText.replace(
      /(<strong>City:<\/strong>.*?<br\s*\/?>)/i,
      `$1<strong>Phone:</strong> ${phoneNumber} <br />`
    );

    // ✅ Build table rows: add Sr No + swap Price and Less column data
    const rows = Array.from(content.querySelectorAll("tbody tr"));
    const tbodyHTML = rows
      .map((row, idx) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 6) return "";

        const product = cells[0].innerHTML;
        const soldQty = cells[1].innerHTML;
        const weight = cells[2].innerHTML;
        const less = cells[3].innerHTML.replace(/₹/g, "");   // remove ₹
        const price = cells[4].innerHTML.replace(/₹/g, "");  // remove ₹
        const packet = cells[5].innerHTML;

        return `<tr>
        <td>${idx + 1}</td>
        <td>${product}</td>
        <td>${soldQty}</td>
        <td>${weight}</td>
        <td>${price}</td>   <!-- ✅ swapped -->
        <td>${less}</td>    <!-- ✅ swapped -->
        <td>${packet}</td>
      </tr>`;
      })
      .join("");

    const printWindow = window.open("", "", "width=900,height=650");
    printWindow.document.write(`
    <html>
      <head>
        <title>Sell Order</title>
        <style>
          @page {
            size: A5;
            margin: 10mm;
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            transform: scale(0.85);
            transform-origin: top left;
            counter-reset: page;
          }
          h2 {
            text-align: center;
            margin-bottom: 10px;
          }
          .order-header {
            margin-bottom: 15px;
            font-size: 14px;
            line-height: 1.5;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #000;
            padding: 6px;
            text-align: center;
          }
          thead {
            display: table-header-group;
          }
          .pending-row {
            font-weight: bold;
            font-style: italic;
            text-transform: uppercase;
            background-color: #f9f9f9;
            border-top: 2px solid #ccc;
          }
          .page-number:after {
            counter-increment: page;
            content: "Page " counter(page);
          }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th colspan="7" style="text-align:right;">
                <span class="page-number"></span>
              </th>
            </tr>
            <tr>
              <th colspan="7">
                <h2>SELL ORDER</h2>
                <div class="order-header">
                  ${headerHTML}
                </div>
              </th>
            </tr>
            <tr>
              <th>Sr No.</th>
              <th>Product</th>
              <th>Sold Qty</th>
              <th>Weight</th>
              <th>Price</th>   <!-- ✅ swapped -->
              <th>Less</th>    <!-- ✅ swapped -->
              <th>Packet</th>
            </tr>
          </thead>
          <tbody>
            ${tbodyHTML}
          </tbody>
        </table>
      </body>
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

  const filteredOrders = sellOrders.filter(order => {
    const orderDate = new Date(order.timestamp).toISOString().slice(0, 10);
    return orderDate === selectedDate;
  });

  return (
    <div className="orderpage-container">
      <h2 style={{ textAlign: 'center' }}>SELL ORDERS</h2>

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
                <button
  style={{ background: 'red', color: 'white', padding: '5px 10px', marginLeft: '8px' }}
  onClick={() => {
    const confirmBox = document.createElement("div");
    confirmBox.innerHTML = `
      <div style="
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); display: flex;
        align-items: center; justify-content: center; z-index: 9999;
      ">
        <div style="
          background: white; padding: 20px; border-radius: 10px;
          text-align: center; width: 300px; font-family: Arial;
        ">
          <p style="margin-bottom: 20px; font-size: 16px; color: #333;">
            Are you sure you want to delete this entire order?
          </p>
          <button id="confirmYes" style="
            background: red; color: white; padding: 6px 12px;
            border: none; border-radius: 5px; margin-right: 10px;
            cursor: pointer;
          ">Yes</button>
          <button id="confirmNo" style="
            background: gray; color: white; padding: 6px 12px;
            border: none; border-radius: 5px; cursor: pointer;
          ">No</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmBox);

    document.getElementById("confirmYes").onclick = () => {
      remove(ref(db, `sellOrders/${order.id}`));
      document.body.removeChild(confirmBox);
    };

    document.getElementById("confirmNo").onclick = () => {
      document.body.removeChild(confirmBox);
    };
  }}
>
  Delete
</button>


              </div>
            </div>

            <div ref={(el) => (printRefs.current[order.id] = el)}>
              <div className="order-header">
                <div>
                  <strong>User:</strong> {order.user} <br />
                  <strong>Customer:</strong> {order.customerName} <br />
                  <strong>City:</strong> {order.city} <br />
                  <strong>Transport:</strong> {order.transportName || '-'} <br />
                  <strong>Sold On:</strong> {new Date(order.timestamp).toLocaleString()}
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    {/* ❌ Removed Original Qty from print */}
                    <th>Sold Qty</th>
                    <th>Weight</th>
                    <th>Less</th>
                    <th>Price</th>
                    <th>Packet</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.productName}</td>
                      <td>{item.soldQty || item.originalQty} {item.unit}</td>
                      <td>{item.weight || '-'}</td>
                      <td>{item.less || '-'}</td>
                      <td>₹{item.price}</td>
                      <td>{item.packet || '-'}</td>
                      <td>
                        <button
  style={{ background: 'red', color: 'white', padding: '3px 6px' }}
  onClick={() => {
    const confirmBox = document.createElement("div");
    confirmBox.innerHTML = `
      <div style="
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); display: flex;
        align-items: center; justify-content: center; z-index: 9999;
      ">
        <div style="
          background: white; padding: 20px; border-radius: 10px;
          text-align: center; width: 300px; font-family: Arial;
        ">
          <p style="margin-bottom: 20px; font-size: 16px; color: #333;">
            Are you sure you want to delete this item?
          </p>
          <button id="confirmYes" style="
            background: red; color: white; padding: 6px 12px;
            border: none; border-radius: 5px; margin-right: 10px;
            cursor: pointer;
          ">Yes</button>
          <button id="confirmNo" style="
            background: gray; color: white; padding: 6px 12px;
            border: none; border-radius: 5px; cursor: pointer;
          ">No</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmBox);

    document.getElementById("confirmYes").onclick = () => {
      const updatedItems = order.items.filter((_, idx) => idx !== i);
      update(ref(db, `sellOrders/${order.id}`), { items: updatedItems });
      document.body.removeChild(confirmBox);
    };

    document.getElementById("confirmNo").onclick = () => {
      document.body.removeChild(confirmBox);
    };
  }}
>
  Delete
</button>

                      </td>
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
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Original Qty</th>
                  <th>Sold Qty</th>
                  <th>Weight</th>
                  <th>Less</th>
                  <th>Price</th>
                  <th>Packet</th>
                  <th>Action</th>
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
                    <td><input value={item.packet || ''} onChange={(e) => handleItemChange(idx, 'packet', e.target.value)} /></td>
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
