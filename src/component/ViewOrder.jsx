import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Style.css';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, remove } from 'firebase/database';
import { update, get } from "firebase/database";
import EditAddProduct from './EditAddProduct';

const firebaseConfig = {
  databaseURL: "https://mb-order-3764e-default-rtdb.firebaseio.com"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


const ViewOrder = () => {
  const [orders, setOrders] = useState([]);
  const [userName, setUserName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editOrderData, setEditOrderData] = useState(null);
  const [transportName, setTransportName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false); // ✅ New state
  const [activeOrderId, setActiveOrderId] = useState(null); // ✅ add this


  // Editing row info now includes isPending flag for pending rows
  const [editingRow, setEditingRow] = useState({ orderKey: null, rowIndex: null, isPending: false });
  const [editedItem, setEditedItem] = useState(null);

  const navigate = useNavigate();
  const isAuthorizedUser = name => ['huzaifa bhai', 'ammar bhai', 'shop'].includes(name.toLowerCase());
  const isAuthorizedAdd = name => ['huzaifa bhai', 'ammar bhai', 'shop'].includes(name.toLowerCase());



  useEffect(() => {
    const storedUser = localStorage.getItem('userName');
    if (!storedUser) {
      alert('User not found. Please log in again.');
      navigate('/', { replace: true });
      return;
    }
    setUserName(storedUser);

    const unsub = onValue(ref(db, 'orders'), snap => {
      const data = snap.val(), flat = [];
      if (data) {
        Object.entries(data).forEach(([user, userOrders]) => {
          Object.entries(userOrders).forEach(([orderKey, orderObj]) => {
            flat.push({
              key: `${user}_${orderKey}`, // unique key per order
              user,
              orderId: orderKey,
              customerName: orderObj.customerName || 'Unknown',
              orderData: orderObj
            });
          });
        });
      }
      flat.sort((a, b) => new Date(b.orderData.timestamp) + new Date(a.orderData.timestamp));
      setOrders(flat);
    });
    

    // ✅ fetch transport name if editing an order
    const fetchTransportName = async () => {
      if (storedUser && editOrderData?.orderId) {
        try {
          const snapshot = await get(ref(db, `orders/${storedUser}/${editOrderData.orderId}/transportName`));
          if (snapshot.exists()) {
            setTransportName(snapshot.val());
          }
        } catch (error) {
          console.error("Error fetching transportName:", error);
        }
      }
    };
    fetchTransportName();

    return () => unsub();
  }, [navigate, editOrderData]);

  // Existing functions ...

  // Replace the existing handleSellOrder function with this:



  const handleSellOrder = (user, customerName, orderData, orderId) => {
    // Normal items
    const normalItems = (orderData.items || []).map(i => ({
      ...i,
      sellQty: i.soldQty ?? i.sellQty ?? "", // ✅ Take soldQty first, then existing sellQty, else empty
      isPending: false
    }));

    // Pending items
    const pendingItems = (orderData.pendingOrderRows || []).map(i => ({
      ...i,
      sellQty: i.soldQty ?? i.sellQty ?? "", // ✅ Same logic for pending
      isPending: true
    }));

    // ✅ Pending items first
    const combinedItems = [...pendingItems, ...normalItems];


    setEditOrderData({
      user,
      customerName,
      city: orderData.city,
      items: combinedItems,
      orderId,
      orderData // ✅ keep original for save
    });

    setShowModal(true);
  };


  // 🚨 Add this helper at the top of ViewOrder.jsx
const showAlert = (message, type = "error") => {
  const colors = {
    success: { border: "#4CAF50", text: "#2e7d32" },
    error: { border: "#f44336", text: "#b71c1c" },
    info: { border: "#2196F3", text: "#0d47a1" },
  };

  const { border, text } = colors[type] || colors.error;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div style="
      position: fixed; top: 40px; left: 50%; transform: translateX(-50%);
      background: #ffffff; color: ${text}; padding: 20px 30px;
      border-radius: 12px; font-family: 'Segoe UI', sans-serif;
      font-size: 18px; font-weight: 500;
      border-left: 8px solid ${border};
      box-shadow: 0 6px 20px rgba(0,0,0,0.2);
      z-index: 9999; opacity: 0; transition: opacity 0.4s ease;
      min-width: 350px; text-align: center;
    ">
      ${message}
    </div>
  `;
  const box = wrapper.firstElementChild;
  document.body.appendChild(box);

  // 🔥 Fade in
  requestAnimationFrame(() => {
    box.style.opacity = "1";
  });

  // ⏱ Auto remove after 3 seconds with fade out
  setTimeout(() => {
    box.style.opacity = "0";
    setTimeout(() => box.remove(), 500);
  }, 3000);
};

  // Replace saveEdit function with this updated version:

  const saveEdit = async () => {
  const { user, customerName, city, items, orderId } = editOrderData;

  if (!transportName.trim()) {
    return showAlert("Transport Name is required.", "error");
  }

  for (const i of items) {
    if (i.sellQty === "" || i.sellQty === null || i.sellQty === undefined) {
      return showAlert("Sell Qty is required for all items.", "error");
    }

    const sell = +i.sellQty;
    if (isNaN(sell) || sell < 0) {
      return showAlert("Please enter valid Sell Qty for all items.", "error");
    }

    if (!i.price || !i.less) {
      return showAlert("Price and Less fields are required for all items.", "error");
    }
  }


    // ✅ Split items: >0 goes to sellOrders, =0 goes to pendingOrders
    const sellItems = [];
    const pendingItems = [];

    items.forEach(i => {
      const sell = +i.sellQty;
      const avail = +i.qty || 0;

      if (sell > 0) {
        sellItems.push({
          ...i,
          originalQty: avail,
          soldQty: sell,
          remainingQty: avail - sell
        });
      } else {
        // ✅ full row into pending
        pendingItems.push({
          ...i,
          originalQty: avail,
          soldQty: 0,
          remainingQty: avail
        });
      }
    });

    // ✅ Only print + push sellOrders if there are sold items
    if (sellItems.length > 0) {
      await handlePrint(customerName, city, sellItems, transportName);

      await push(ref(db, 'sellOrders'), {
        user,
        customerName,
        city,
        transportName: transportName || '',
        timestamp: new Date().toISOString(),
        items: sellItems.map(i => ({
          productName: i.productName,
          originalQty: i.originalQty,
          soldQty: i.soldQty,
          unit: i.unit,
          weight: i.weight,
          price: i.price,
          less: i.less,
          packet: i.packet || ''
        }))
      });

      // ✅ Remaining qty > 0 from sold rows → pending
      sellItems.forEach(i => {
        if (i.remainingQty > 0) {
          pendingItems.push({
            user,
            customerName,
            city: city || '',
            productName: i.productName,
            soldQty: i.soldQty,
            remainingQty: i.remainingQty,
            unit: i.unit,
            weight: i.weight || '',
            price: i.price,
            less: i.less || '',
            packet: i.packet || '',
            timestamp: new Date().toISOString()
          });
        }
      });
    }

    // ✅ Push all pending rows (both sell=0 and remaining from sold)
    for (const i of pendingItems) {
      await push(ref(db, 'pendingOrders'), {
        user,
        customerName,
        city: i.city || city || '',
        productName: i.productName,
        soldQty: i.soldQty,
        remainingQty: i.remainingQty,
        unit: i.unit,
        weight: i.weight || '',
        price: i.price,
        less: i.less || '',
        packet: i.packet || '',
        timestamp: new Date().toISOString()
      });
    }

    // ✅ Remove original order after processing
    await remove(ref(db, `orders/${user}/${orderId}`));
    setOrders(p => p.filter(o => !(o.user === user && o.orderId === orderId)));
    setShowModal(false);
  };

  const cleanProductName = n => n.replace(/\s*\([^)]*\)/g, '').trim();
  const printSoldItems = (customerName, city, sold, phoneNumber, transportName) => {
    const date = new Date().toLocaleDateString();
    const w = window.open('', '_blank', 'width=800,height=600');
    const html = `
  <html>
  <head>
    <title>Sold Items</title>
    <style>
      @page {
        size: A5;
        margin: 10mm;
      }
      body {
        font-family: Arial;
        padding: 20px;
        transform: scale(0.85);
        transform-origin: top left;
        counter-reset: page;
      }
      h2 {
        text-align: center;
        margin-bottom: 10px;
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
        display: table-header-group; /* ✅ Repeat header on every page */
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
            <h2>Sold Items</h2>
            <div><strong>Customer:</strong> ${customerName}</div>
            <div><strong>City:</strong> ${city}</div>
            <div><strong>Phone:</strong> ${phoneNumber || '-'}</div>
            <div><strong>Transport:</strong> ${transportName || '-'}</div>
            <div><strong>Date:</strong> ${date}</div>
          </th>
        </tr>
        <tr>
          <th>Sr No.</th>
          <th>Product</th>
          <th>Sold Qty</th>
          <th>Weight</th>
          <th>Price</th>
          <th>Less</th>
          <th>Packet</th>
        </tr>
      </thead>
      <tbody>
        ${(sold || []).map((i, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${cleanProductName(i.productName)}</td>
            <td>${i.soldQty} ${i.unit || ''}</td>
            <td>${i.weight || '-'}</td>
            <td>${i.price}</td>
            <td>${(typeof i.less === 'number' || (typeof i.less === 'string' && !isNaN(Number(i.less))))
        ? i.less + '%'
        : (i.less || '-')
      }</td>
            <td>${i.packet || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <script>
      window.onload = () => {
        window.print();
        window.onafterprint = () => window.close();
      };
    </script>
  </body>
  </html>`;
    w.document.write(html);
    w.document.close();
  };
  const handlePrint = async (customerName, city, sold) => {
    try {
      const snapshot = await get(ref(db, "customers"));
      let phoneNumber = "-";
      if (snapshot.exists()) {
        const customers = snapshot.val();
        for (let key in customers) {
          if (customers[key].name === customerName) {
            phoneNumber = customers[key].number || "-";
            break;
          }
        }
      }
      printSoldItems(customerName, city, sold, phoneNumber, transportName);
    } catch (err) {
      console.error("Error fetching phone:", err);
      printSoldItems(customerName, city, sold, "-");
    }
  };
  // --- Edit and Delete for normal order rows ---
  const startEditRow = (orderKey, item, rowIndex) => {
    setEditingRow({ orderKey, rowIndex, isPending: false });
    setEditedItem({
      productName: item.productName || '',   // ✅ include product name
      qty: item.qty || 0,
      weight: item.weight || '',             // ✅ fixed typo
      less: item.less || '',
      price: item.price || '',
      packet: item.packet || ''
    });
  };
  const saveRowEdit = async (user, orderId, idx) => {
    const orderRef = ref(db, `orders/${user}/${orderId}/items`);
    onValue(orderRef, async snap => {
      const dbItems = snap.val();
      if (Array.isArray(dbItems)) {
        let updatedItem = { ...editedItem };
        // ✅ If productName contains "(X pcs)" and qty entered
        const match = updatedItem.productName?.match(/\((\d+)\s*pcs\)/i);
        if (match && updatedItem.qty) {
          const pcsPerPacket = parseInt(match[1], 10);
          const enteredPackets = parseInt(updatedItem.qty, 10);
          if (!isNaN(enteredPackets)) {
            updatedItem.packet = enteredPackets;                        // user input → pk
            updatedItem.qty = `${enteredPackets * pcsPerPacket} pcs`;   // keep unit
          }
        }
        dbItems[idx] = updatedItem;
        const filtered = dbItems.filter(i => parseInt(i.qty) > 0);
        if (!filtered.length) {
          await remove(ref(db, `orders/${user}/${orderId}`));
          setOrders(p => p.filter(o => !(o.user === user && o.key === `${user}_${orderId}`)));
        } else {
          await set(orderRef, filtered);
          setOrders(p => p.map(o =>
            o.key === `${user}_${orderId}`
              ? { ...o, orderData: { ...o.orderData, items: filtered } }
              : o
          ));
        }
        setEditingRow({ orderKey: null, rowIndex: null, isPending: false });
        setEditedItem(null);
      }
    }, { onlyOnce: true });
  };
  const deleteRow = async (user, orderId, idx) => {
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

  document.getElementById("confirmYes").onclick = async () => {
    const orderRef = ref(db, `orders/${user}/${orderId}`);
    const itemsRef = ref(db, `orders/${user}/${orderId}/items`);
    onValue(itemsRef, async snap => {
      let dbItems = snap.val();
      if (Array.isArray(dbItems)) {
        dbItems.splice(idx, 1);
        if (!dbItems.length) {
          const pendingSnap = await get(ref(db, `orders/${user}/${orderId}/pendingOrderRows`));
          const pending = pendingSnap.val();
          if (!pending || !pending.length) {
            await remove(orderRef);
            setOrders(p => p.filter(o => !(o.user === user && o.key === `${user}_${orderId}`)));
          } else {
            await set(itemsRef, []);
            setOrders(p => p.map(o =>
              o.key === `${user}_${orderId}`
                ? { ...o, orderData: { ...o.orderData, items: [] } }
                : o
            ));
          }
        } else {
          await set(itemsRef, dbItems);
          setOrders(p => p.map(o =>
            o.key === `${user}_${orderId}`
              ? { ...o, orderData: { ...o.orderData, items: dbItems } }
              : o
          ));
        }
      }
    }, { onlyOnce: true });
    document.body.removeChild(confirmBox);
  };

  document.getElementById("confirmNo").onclick = () => {
    document.body.removeChild(confirmBox);
  };
};

  // --- New: Edit and Delete for pendingOrderRows ---
  const startEditPendingRow = (orderKey, item, rowIndex) => {
    setEditingRow({ orderKey, rowIndex, isPending: true });
    setEditedItem({ ...item });
  };
  const savePendingRowEdit = async (user, orderId, idx) => {
    const pendingRef = ref(db, `orders/${user}/${orderId}/pendingOrderRows`);
    onValue(pendingRef, async snap => {
      const pendingItems = snap.val();
      if (Array.isArray(pendingItems)) {
        let updatedItem = { ...editedItem };
        // ✅ Apply same logic for pending rows
        const match = updatedItem.productName?.match(/\((\d+)\s*pcs\)/i);
        if (match && updatedItem.qty) {
          const pcsPerPacket = parseInt(match[1], 10);
          updatedItem.packet = updatedItem.qty;              // user’s entered number → packets
          updatedItem.qty = updatedItem.qty * pcsPerPacket; // convert to pcs
        }
        pendingItems[idx] = updatedItem;
        const filtered = pendingItems.filter(i => i.qty > 0);
        if (!filtered.length) {
          await set(pendingRef, null);
          const orderRef = ref(db, `orders/${user}/${orderId}`);
          onValue(orderRef, snap2 => {
            const orderData = snap2.val();
            if ((!orderData.items || orderData.items.length === 0) && (!filtered.length)) {
              remove(orderRef);
              setOrders(p => p.filter(o => !(o.user === user && o.key === `${user}_${orderId}`)));
            }
          }, { onlyOnce: true });
        } else {
          await set(pendingRef, filtered);
          setOrders(p => p.map(o => o.key === `${user}_${orderId}` ? { ...o, orderData: { ...o.orderData, pendingOrderRows: filtered } } : o));
        }
        setEditingRow({ orderKey: null, rowIndex: null, isPending: false });
        setEditedItem(null);
      }
    }, { onlyOnce: true });
  };
  const deletePendingRow = async (user, orderId, idx) => {
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
          Are you sure you want to delete this pending item?
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

  document.getElementById("confirmYes").onclick = async () => {
    const orderRef = ref(db, `orders/${user}/${orderId}`);
    const pendingRef = ref(db, `orders/${user}/${orderId}/pendingOrderRows`);
    onValue(pendingRef, async snap => {
      let pendingItems = snap.val();
      if (Array.isArray(pendingItems)) {
        pendingItems.splice(idx, 1);
        if (!pendingItems.length) {
          const itemsSnap = await get(ref(db, `orders/${user}/${orderId}/items`));
          const items = itemsSnap.val();
          if (!items || !items.length) {
            await remove(orderRef);
            setOrders(p => p.filter(o => !(o.user === user && o.key === `${user}_${orderId}`)));
          } else {
            await set(pendingRef, []);
            setOrders(p => p.map(o =>
              o.key === `${user}_${orderId}`
                ? { ...o, orderData: { ...o.orderData, pendingOrderRows: [] } }
                : o
            ));
          }
        } else {
          await set(pendingRef, pendingItems);
          setOrders(p => p.map(o =>
            o.key === `${user}_${orderId}`
              ? { ...o, orderData: { ...o.orderData, pendingOrderRows: pendingItems } }
              : o
          ));
        }
      }
    }, { onlyOnce: true });
    document.body.removeChild(confirmBox);
  };

  document.getElementById("confirmNo").onclick = () => {
    document.body.removeChild(confirmBox);
  };
};

  const previewAndPrint = ({ user, customerName, orderData, orderId }) => {
    const w = window.open('', '_blank', 'width=800,height=600');
    const combinedRows = [
      ...(orderData.pendingOrderRows || []).map(r => ({ ...r, isPending: true })),
      ...(orderData.items || []).map(r => ({ ...r, isPending: false }))
    ];
    const html = `
  <html>
  <head>
      <title>Print</title>
      <style>
          @page {
            size: A5;
            margin: 10mm;
          }
          body {
            font-family: Arial;
            padding: 20px;
            transform: scale(0.85);
            transform-origin: top left;
            counter-reset: page;
          }
          h2 {
            text-align: center;
            margin-bottom: 10px;
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
            display: table-header-group; /* ✅ Repeat header on every page */
          }
          .pending-row {
            font-weight: bold;
            font-style: italic;
            text-transform: uppercase;
            background-color: #000000ff;
            border-top: 2px solid #000000ff;
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
                    <h2>Order Summary</h2>
                    <div><strong>User:</strong> ${user}</div>
                    <div><strong>Customer:</strong> ${customerName}</div>
                    <div><strong>City:</strong> ${orderData.city}</div>
                    <div><strong>Placed On:</strong> ${orderData.timestamp}</div>
                </th>
            </tr>
            <tr>
                <th>SR NO.</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Weight</th>
                <th>Price</th>
                <th>Less</th>
                <th>Packet</th>
            </tr>
        </thead>
        <tbody>
          ${combinedRows.map((i, index) => `
            <tr class="${i.isPending ? 'pending-row' : ''}">
              <td>${index + 1}</td>
              <td>${cleanProductName(i.productName)}</td>
              <td>${i.originalQty || i.qty} ${i.unit || ''}</td>
              <td>${i.weight || '-'}</td>
              <td>${i.price}</td>
              <td>${(typeof i.less === 'number' || (typeof i.less === 'string' && !isNaN(Number(i.less))))
        ? i.less + '%'
        : (i.less || '-')
      }</td>
              <td>${i.packet || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
  </body>
  </html>
  `;
    w.document.write(html);
    w.document.close();
    w.print();
  };
  window.deleteOrderFromFirebase = (user, customerName, orderId) => {
    const orderRef = ref(db, `orders/${user}/${customerName}/${orderId}`);
    remove(orderRef)
      .then(() => {
        console.log('Order deleted from Firebase');
      })
      .catch(err => console.error('Error deleting order:', err));
  };
  // add order data
  // --- Function inside ViewOrder ---
  const handleAddOrder = async (orderId) => {
    try {
      // Save orderId into addOrder
      await set(ref(db, `addOrder/${orderId}`), true);

      // Store the active orderId so we can delete it later on close
      setActiveOrderId(orderId);

      // Open modal with OrderPage
      setShowAddModal(true);
    } catch (err) {
      console.error("Error adding order:", err);
    }
  };
  const handleCloseModal = async () => {
    try {
      if (activeOrderId) {
        await remove(ref(db, `addOrder/${activeOrderId}`));
        setActiveOrderId(null); // clear state
      }
      setShowAddModal(false);
    } catch (err) {
      console.error("Error closing modal:", err);
    }
  };
  return (
    <div className="orderpage-container">
      <h2 style={{ textAlign: 'center' }}>VIEW ORDERS</h2>
      {orders.length === 0 ? (
        <p style={{ textAlign: 'center' }}>No orders found.</p>
      ) : (
        orders.map(({ key, user, orderId, customerName, orderData }, index) => (
          <div key={key} className="order-card new">
            <div className="order-header">
              <div>
                <strong>Order No.: {index + 1} </strong><br />
                <strong>User:</strong> {user} <br />
                <strong>Customer:</strong> {customerName} <br />
                <strong>City:</strong> {orderData.city} <br />
                <strong>Placed On:</strong> {orderData.timestamp}
              </div>
              {(isAuthorizedAdd(userName) || userName === user) && (
                <div className="order-action">
                  {/* ✅ Change Add button to open modal */}
                  <button onClick={() => handleAddOrder(orderId)}>Add</button>
                </div>
              )}
              {isAuthorizedUser(userName) && (
                <div className="order-action">
                  {/* ✅ Change Add button to open modal */}
                  <button onClick={() => handleSellOrder(user, customerName, orderData, orderId)}>Sell</button>
                  <button style={{ marginTop: '10px' }} onClick={() => previewAndPrint({ user, customerName, orderData })}>Print</button>
                </div>
              )}
            </div>
            <table>
              <thead>
                <tr>
                  <th>SR NO.</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Sold Qty</th> {/* ✅ Added Sold Qty Column */}
                  <th>Weight</th>
                  <th>Less</th>
                  <th>Price</th>
                  <th>Packet</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* ---------------- PENDING ORDER ROWS ---------------- */}
                {(orderData.pendingOrderRows || []).map((item, i) => {
                  const srNo = i + 1; // SR number for pending
                  return editingRow.orderKey === key && editingRow.rowIndex === i && editingRow.isPending ? (
                    <tr key={`pending-edit-${i}`}>
                      <td>{srNo}</td>
                      <td>{editedItem.productName}</td> {/* productName NOT editable */}
                      <td>
                        <input
                          type="number"
                          value={editedItem.qty}
                          onChange={e => setEditedItem({ ...editedItem, qty: e.target.value })}
                          style={{ width: '70px', fontSize: '14px' }}
                        />{' '}
                        {editedItem.unit}
                      </td>
                      <td>
                        {editedItem.sellQty || 0} {editedItem.unit}
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editedItem.weight}
                          onChange={e => setEditedItem({ ...editedItem, weight: e.target.value })}
                          style={{ width: '60px', fontSize: '14px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editedItem.less}
                          onChange={e => setEditedItem({ ...editedItem, less: e.target.value })}
                          style={{ width: '60px', fontSize: '14px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editedItem.price}
                          onChange={e => setEditedItem({ ...editedItem, price: e.target.value })}
                          style={{ width: '60px', fontSize: '14px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editedItem.packet || ''}
                          onChange={e => setEditedItem({ ...editedItem, packet: e.target.value })}
                          style={{ width: '60px', fontSize: '14px' }}
                        />
                      </td>
                      <td>
                        <button onClick={() => savePendingRowEdit(user, orderId, i)}>Save</button>
                        <button onClick={() => setEditingRow({ orderKey: null, rowIndex: null, isPending: false })}>
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={`pending-${i}`} className="pending-row">
                      <td>{srNo}</td>
                      <td>{item.productName}</td>
                      <td>{item.qty} {item.unit}</td>
                      <td>{item.sellQty || 0} {item.unit}</td> {/* ✅ Sold Qty with Unit */}
                      <td>{item.weight || '-'}</td>
                      <td>{item.less || '-'}</td>
                      <td>₹{item.price}</td>
                      <td>{item.packet || '-'}</td>
                      <td>
                        {(isAuthorizedUser(userName) || userName === user) && (
                          <>
                            <button onClick={() => startEditPendingRow(key, item, i)}>Edit</button>
                            <button onClick={() => deletePendingRow(user, orderId, i)}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {/* ---------------- NORMAL ORDER ITEMS ---------------- */}
                {(orderData.items || []).map((item, i) => {
                  const srNo = (orderData.pendingOrderRows?.length || 0) + i + 1; // Continue numbering after pending
                  return editingRow.orderKey === key && editingRow.rowIndex === i && !editingRow.isPending ? (
                    <tr key={`normal-edit-${i}`}>
                      <td>{srNo}</td>
                      <td>{editedItem.productName}</td> {/* productName NOT editable */}
                      <td>
                        <input
                          type="number"
                          value={editedItem.qty}
                          onChange={e => setEditedItem({ ...editedItem, qty: e.target.value })}
                          style={{ width: '70px', fontSize: '14px' }}
                        />{' '}
                        {editedItem.unit}
                      </td>
                      <td>
                        {/* sellQty is NOT editable */}
                        {editedItem.sellQty || 0} {editedItem.unit}
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editedItem.weight}
                          onChange={e => setEditedItem({ ...editedItem, weight: e.target.value })}
                          style={{ width: '60px', fontSize: '14px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editedItem.less}
                          onChange={e => setEditedItem({ ...editedItem, less: e.target.value })}
                          style={{ width: '60px', fontSize: '14px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editedItem.price}
                          onChange={e => setEditedItem({ ...editedItem, price: e.target.value })}
                          style={{ width: '60px', fontSize: '14px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editedItem.packet || ''}
                          onChange={e => setEditedItem({ ...editedItem, packet: e.target.value })}
                          style={{ width: '60px', fontSize: '14px' }}
                        />
                      </td>
                      <td>
                        <button onClick={() => saveRowEdit(user, orderId, i)}>Save</button>
                        <button onClick={() => setEditingRow({ orderKey: null, rowIndex: null, isPending: false })}>
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={`normal-${i}`}>
                      <td>{srNo}</td>
                      <td>{item.productName}</td>
                      <td>{item.originalQty || item.qty} {item.unit}</td>
                      <td>{item.sellQty || 0} {item.unit}</td> {/* ✅ Show Sold Qty */}
                      <td>{item.weight || '-'}</td>
                      <td>{item.less || '-'}</td>
                      <td>₹{item.price}</td>
                      <td>{item.packet || '-'}</td>
                      <td>
                        {(isAuthorizedUser(userName) || userName === user) && (
                          <>
                            <button onClick={() => startEditRow(key, item, i)}>Edit</button>
                            <button onClick={() => deleteRow(user, orderId, i)}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
      {/* add order item sq */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div
            className="modal-box"
            style={{
              width: "90%",
              height: "90%",
              background: "#fff",
              borderRadius: "10px",
              zIndex: 1000
            }}
          >
            <EditAddProduct />  {/* ✅ Open OrderPage.jsx full screen */}
            <div style={{ textAlign: "center", marginTop: "15px" }}>
              <button onClick={handleCloseModal}>Close</button>
            </div>
          </div>
        </div>
      )}
      {showModal && editOrderData && (
        <div className="modal-backdrop">
          <div
            className="modal-box"
            style={{
              width: '90%',
              height: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '20px',
              background: '#fff',
              borderRadius: '10px',
            }}
          >
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
              Sell Order: {editOrderData.customerName}
            </h2>
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <label htmlFor="transportName" style={{ marginRight: '10px' }}>
                Transport Name:
              </label>
              <input
                type="text"
                id="transportName"
                value={transportName}
                onChange={(e) => setTransportName(e.target.value)}
                style={{
                  padding: '5px 10px',
                  width: '200px',
                  borderRadius: '5px',
                  border: '1px solid #ccc',
                }}
              />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Available Qty</th>
                  <th>Sell Qty</th>
                  <th>Weight</th>
                  <th>KG Rate</th>
                  <th>Price</th>
                  <th>Less</th>
                  <th>Packet</th>
                </tr>
              </thead>
              <tbody>
                {(editOrderData.items || []).map((item, idx) => {
                  return (
                    <tr key={idx} className={item.isPending ? 'pending-row' : ''}>
                      <td>{item.productName}</td>
                      <td>{item.qty} {item.unit}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={item.sellQty}
                          style={{ width: '80px' }}
                          required
                          onChange={e => {
                            const value = e.target.value < 0 ? 0 : e.target.value;
                            const up = [...editOrderData.items];
                            up[idx].sellQty = value;
                            setEditOrderData({ ...editOrderData, items: up });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.weight}
                          style={{ width: '70px' }}
                          onChange={e => {
                            const up = [...editOrderData.items];
                            up[idx].weight = e.target.value;
                            setEditOrderData({ ...editOrderData, items: up });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={item.kgRate || ''}
                          style={{ width: '70px' }}
                          onChange={e => {
                            const value = e.target.value < 0 ? 0 : e.target.value;
                            const up = [...editOrderData.items];
                            up[idx].kgRate = value;
                            const weight = parseFloat(up[idx].weight) || 0;
                            const sellQty = parseFloat(up[idx].sellQty) || 1;
                            if (value && weight && sellQty > 0) {
                              up[idx].price = Math.ceil((value * weight) / sellQty);
                            }
                            setEditOrderData({ ...editOrderData, items: up });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.price}
                          style={{ width: '70px' }}
                          required
                          onChange={e => {
                            const up = [...editOrderData.items];
                            up[idx].price = e.target.value;
                            setEditOrderData({ ...editOrderData, items: up });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.less}
                          style={{ width: '70px' }}
                          required
                          onChange={e => {
                            const up = [...editOrderData.items];
                            up[idx].less = e.target.value;
                            setEditOrderData({ ...editOrderData, items: up });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.packet || ''}
                          style={{ width: '70px' }}
                          onChange={e => {
                            const up = [...editOrderData.items];
                            up[idx].packet = e.target.value;
                            setEditOrderData({ ...editOrderData, items: up });
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div
              className="modal-actions"
              style={{
                marginTop: '20px',
                textAlign: 'center',
                position: 'sticky',
                bottom: 0,
                background: '#fff',
                paddingTop: '10px',
              }}
            >
              <button onClick={saveEdit} style={{ marginRight: '10px' }}>
                Sell Order
              </button>
              {/* New Save Button */}
              <button
                onClick={async () => {
                  if (!editOrderData) return;
                  const { user, orderId, orderData, items } = editOrderData;
                  const updatedItems = (items || []).map(item => ({
                    ...item,
                    sellQty: item.sellQty ?? "",
                    less: item.less ?? "",
                    price: item.price ?? 0,
                    packet: item.packet ?? ""
                  }));
                  try {
                    // ✅ Separate normal vs pending rows
                    const normalItems = updatedItems.filter(i => !i.isPending && parseFloat(i.sellQty) > 0);
                    const pendingItems = updatedItems.filter(i => i.isPending || parseFloat(i.sellQty) === 0);
                    // ✅ Update Firebase correctly
                    await update(ref(db, `orders/${user}/${orderId}`), {
                      ...orderData,
                      transportName: transportName || "",   // ✅ added
                      items: normalItems,
                      pendingOrderRows: pendingItems
                    });



                    // ✅ Update local state
                    setOrders(prev =>
                      prev.map(order =>
                        order.orderId === orderId && order.user === user
                          ? { ...order, orderData: { ...orderData, items: normalItems, pendingOrderRows: pendingItems } }
                          : order
                      )
                    );
                    setEditOrderData(prev => ({
                      ...prev,
                      orderData: { ...orderData, items: normalItems, pendingOrderRows: pendingItems },
                      items: updatedItems
                    }));
                  } catch (err) {
                    console.error("Error updating order:", err);
                  } finally {
                    setShowModal(false);
                  }
                }}
                style={{ marginRight: "10px" }}
              >
                Save
              </button>
              <button onClick={() => setShowModal(false)}>Cancel</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
export default ViewOrder;