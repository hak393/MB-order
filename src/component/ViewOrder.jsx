import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Style.css';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, remove } from 'firebase/database';

const firebaseConfig = { databaseURL: "https://mb-order-3764e-default-rtdb.firebaseio.com"
 };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const ViewOrder = () => {
  const [orders, setOrders] = useState([]);
  const [userName, setUserName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editOrderData, setEditOrderData] = useState(null);

  // Editing row info now includes isPending flag for pending rows
  const [editingRow, setEditingRow] = useState({ orderKey: null, rowIndex: null, isPending: false });
  const [editedItem, setEditedItem] = useState(null);

  const navigate = useNavigate();
  const isAuthorizedUser = name => ['huzaifa bhai', 'ammar bhai'].includes(name.toLowerCase());

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
      flat.sort((a, b) => new Date(b.orderData.timestamp) - new Date(a.orderData.timestamp));
      setOrders(flat);
    });

    return () => unsub();
  }, [navigate]);

  // Existing functions ...

  // Replace the existing handleSellOrder function with this:

  const handleSellOrder = (user, customerName, orderData, orderId) => {
    const normalItems = (orderData.items || []).map(i => ({ ...i, sellQty: '', isPending: false }));
    const pendingItems = (orderData.pendingOrderRows || []).map(i => ({ ...i, sellQty: '', isPending: true }));
    const combinedItems = [...normalItems, ...pendingItems];
    setEditOrderData({ user, customerName, city: orderData.city, items: combinedItems, orderId }); // <-- Added orderId here
    setShowModal(true);
  };



  // Replace saveEdit function with this updated version:

  const saveEdit = async () => {
    const { user, customerName, city, items, orderId } = editOrderData; // <-- Added orderId here

    for (const i of items) {
      const avail = +i.qty || 0;
      const sell = +i.sellQty;
      if (isNaN(sell) || sell < 0) return alert('Please enter valid Sell Qty for all items.');
      if (!i.price || !i.less) return alert('Price and Less fields are required for all items.');
      if (sell > avail) return alert('Sell Qty cannot be greater than Available Qty.');
    }

    const processed = items.map(i => ({
      ...i,
      originalQty: +i.qty,
      soldQty: +i.sellQty,
      remainingQty: +i.qty - +i.sellQty
    }));

    printSoldItems(customerName, city, processed);

    await push(ref(db, 'sellOrders'), {
      user,
      customerName,
      city,
      timestamp: new Date().toISOString(),
      items: processed.map(i => ({
        productName: i.productName,
        originalQty: i.originalQty,
        soldQty: i.soldQty,
        unit: i.unit,
        weight: i.weight,
        price: i.price,
        less: i.less
      }))
    });

    processed.forEach(i => {
      if (i.remainingQty > 0) {
        push(ref(db, 'pendingOrders'), {
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
          timestamp: new Date().toISOString()
        });
      }
    });

    // ✅ Delete the specific order using unique ID
    await remove(ref(db, `orders/${user}/${orderId}`));

    setOrders(p => p.filter(o => !(o.user === user && o.orderId === orderId)));
    setShowModal(false);
  };
  const cleanProductName = n => n.replace(/\s*\([^)]*\)/g, '').trim();
  const printSoldItems = (customerName, city, sold) => {
  const date = new Date().toLocaleDateString();
  const w = window.open('', '_blank', 'width=800,height=600');
  const html = `
  <html>
  <head>
    <title>Sold Items</title>
    <style>
      body { font-family: Arial; padding: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #000; padding: 8px; text-align: center; }
    </style>
  </head>
  <body>
    <div><strong>Customer:</strong> ${customerName}</div>
    <div><strong>City:</strong> ${city}</div>
    <div><strong>Date:</strong> ${date}</div>
    <table>
      <thead>
        <tr><th>Product</th><th>Sold Qty</th><th>Weight</th><th>Less</th><th>Price</th></tr>
      </thead>
      <tbody>
        ${(sold || []).map(i => `
          <tr>
            <td>${cleanProductName(i.productName)}</td>
            <td>${i.soldQty}</td>
            <td>${i.weight || '-'}</td>
            <td>${
              (typeof i.less === 'number' || (typeof i.less === 'string' && !isNaN(Number(i.less))))
                ? i.less + '%'
                : (i.less || '-')
            }</td>
            <td>₹${i.price}</td>
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

  // --- Edit and Delete for normal order rows ---
  const startEditRow = (orderKey, item, rowIndex) => {
    setEditingRow({ orderKey, rowIndex, isPending: false });
    setEditedItem({ ...item });
  };
  const saveRowEdit = async (user, orderId, idx) => {
    const orderRef = ref(db, `orders/${user}/${orderId}/items`);
    onValue(orderRef, async snap => {
      const dbItems = snap.val();
      if (Array.isArray(dbItems)) {
        dbItems[idx] = editedItem;
        const filtered = dbItems.filter(i => i.qty > 0);
        if (!filtered.length) {
          await remove(ref(db, `orders/${user}/${orderId}`));
          setOrders(p => p.filter(o => !(o.user === user && o.key === `${user}_${orderId}`)));
        } else {
          await set(orderRef, filtered);
          setOrders(p => p.map(o => o.key === `${user}_${orderId}` ? { ...o, orderData: { ...o.orderData, items: filtered } } : o));
        }
        setEditingRow({ orderKey: null, rowIndex: null, isPending: false });
        setEditedItem(null);
      }
    }, { onlyOnce: true });
  };
  const deleteRow = async (user, orderId, idx) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    const orderRef = ref(db, `orders/${user}/${orderId}/items`);
    onValue(orderRef, async snap => {
      const dbItems = snap.val();
      if (Array.isArray(dbItems)) {
        dbItems.splice(idx, 1);
        if (!dbItems.length) {
          await remove(ref(db, `orders/${user}/${orderId}`));
          setOrders(p => p.filter(o => !(o.user === user && o.key === `${user}_${orderId}`)));
        } else {
          await set(orderRef, dbItems);
          setOrders(p => p.map(o => o.key === `${user}_${orderId}` ? { ...o, orderData: { ...o.orderData, items: dbItems } } : o));
        }
      }
    }, { onlyOnce: true });
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
        pendingItems[idx] = editedItem;
        const filtered = pendingItems.filter(i => i.qty > 0);
        if (!filtered.length) {
          // Remove whole order if no items and no pendingOrderRows
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
    if (!window.confirm('Are you sure you want to delete this pending item?')) return;
    const pendingRef = ref(db, `orders/${user}/${orderId}/pendingOrderRows`);
    onValue(pendingRef, async snap => {
      const pendingItems = snap.val();
      if (Array.isArray(pendingItems)) {
        pendingItems.splice(idx, 1);
        if (!pendingItems.length) {
          await set(pendingRef, null);
          const orderRef = ref(db, `orders/${user}/${orderId}`);
          onValue(orderRef, snap2 => {
            const orderData = snap2.val();
            if ((!orderData.items || orderData.items.length === 0) && (!pendingItems.length)) {
              remove(orderRef);
              setOrders(p => p.filter(o => !(o.user === user && o.key === `${user}_${orderId}`)));
            }
          }, { onlyOnce: true });
        } else {
          await set(pendingRef, pendingItems);
          setOrders(p => p.map(o => o.key === `${user}_${orderId}` ? { ...o, orderData: { ...o.orderData, pendingOrderRows: pendingItems } } : o));
        }
      }
    }, { onlyOnce: true });
  };
  const previewAndPrint = ({ user, customerName, orderData, orderId }) => {
  const w = window.open('', '_blank', 'width=800,height=600');
  const html = `
  <html>
  <head>
      <title>Print</title>
      <style>
          body { font-family: Arial; padding: 20px; }
          h2 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: center; }
          .pending-row {
            font-weight: bold;
            font-style: italic;
            text-transform: uppercase;
            background-color: #f9f9f9;
            border-top: 2px solid #ccc;
          }
      </style>
  </head>
  <body>
      <h2>Order Summary</h2>
      <div><strong>User:</strong> ${user}</div>
      <div><strong>Customer:</strong> ${customerName}</div>
      <div><strong>City:</strong> ${orderData.city}</div>
      <div><strong>Placed On:</strong> ${orderData.timestamp}</div>
      <table>
          <thead>
              <tr><th>Product</th><th>Qty</th><th>Weight</th><th>Less</th><th>Price</th></tr>
          </thead>
          <tbody>
  ${(orderData.items || []).map(i => `
      <tr>
          <td>${cleanProductName(i.productName)}</td>
          <td>${i.originalQty || i.qty} ${i.unit || ''}</td>
          <td>${i.weight || '-'}</td>
          <td>${
            (typeof i.less === 'number' || (typeof i.less === 'string' && !isNaN(Number(i.less))))
              ? i.less + '%'
              : (i.less || '-')
          }</td>
          <td>₹${i.price}</td>
      </tr>
  `).join('')}

  ${(orderData.pendingOrderRows || []).map(i => `
      <tr class="pending-row">
          <td>${cleanProductName(i.productName)}</td>
          <td>${i.originalQty || i.qty} ${i.unit || ''}</td>
          <td>${i.weight || '-'}</td>
          <td>${
            (typeof i.less === 'number' || (typeof i.less === 'string' && !isNaN(Number(i.less))))
              ? i.less + '%'
              : (i.less || '-')
          }</td>
          <td>₹${i.price}</td>
      </tr>
  `).join('')}
</tbody>

      <script>
          window.onload = () => {
              window.print();
              window.onafterprint = () => {
                  if (window.opener && typeof window.opener.deleteOrderFromFirebase === 'function') {
                      window.opener.deleteOrderFromFirebase('${user}', '${customerName}', '${orderId}');
                  }
                  window.close();
              };
          };
      </script>
  </body>
  </html>
  `;
  w.document.write(html);
  w.document.close();
};

  window.deleteOrderFromFirebase = (user, customerName, orderId) => {
    const orderRef = ref(db, `orders/${user}/${customerName}/${orderId}`);
    remove(orderRef)
      .then(() => {
        console.log('Order deleted from Firebase');
      })
      .catch(err => console.error('Error deleting order:', err));
  };
  return (
    <div className="orderpage-container">
      <h2 style={{ textAlign: 'center' }}>VIEW ORDERS</h2>
      {orders.length === 0 ? (
        <p style={{ textAlign: 'center' }}>No orders found.</p>
      ) : (
        orders.map(({ key, user, orderId, customerName, orderData }) => (
          <div key={key} className="order-card new">
            <div className="order-header">
              <div>
                <strong>User:</strong> {user} <br />
                <strong>Customer:</strong> {customerName} <br />
                <strong>City:</strong> {orderData.city} <br />
                <strong>Placed On:</strong> {orderData.timestamp}
              </div>
              {isAuthorizedUser(userName) && (
                <div className="order-action">
                  <button onClick={() => handleSellOrder(user, customerName, orderData, orderId)}>Sell</button>

                  <button style={{ marginTop: '10px' }} onClick={() => previewAndPrint({ user, customerName, orderData })}>Print</button>
                </div>
              )}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Weight</th>
                  <th>Less</th>
                  <th>Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Pending order rows with edit/delete */}
                {(orderData.pendingOrderRows || []).map((item, i) =>
                  editingRow.orderKey === key && editingRow.rowIndex === i && editingRow.isPending ? (
                    <tr key={`pending-edit-${i}`}>
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
                        <button onClick={() => savePendingRowEdit(user, orderId, i)}>Save</button>
                        <button onClick={() => setEditingRow({ orderKey: null, rowIndex: null, isPending: false })}>Cancel</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={`pending-${i}`} className="pending-row">
                      <td>{item.productName}</td>
                      <td>{item.qty} {item.unit}</td>
                      <td>{item.weight || '-'}</td>
                      <td>{item.less || '-'}</td>
                      <td>₹{item.price}</td>
                      <td>
                        {(isAuthorizedUser(userName) || userName === user) && (
                          <>
                            <button onClick={() => startEditPendingRow(key, item, i)}>Edit</button>
                            <button onClick={() => deletePendingRow(user, orderId, i)}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                )}

                {/* Normal order items */}
                {(orderData.items || []).map((item, i) =>
                  editingRow.orderKey === key && editingRow.rowIndex === i && !editingRow.isPending ? (
                    <tr key={i}>
                      <td>{editedItem.productName}</td> {/* productName is NOT editable */}
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
                        <button onClick={() => saveRowEdit(user, orderId, i)}>Save</button>
                        <button onClick={() => setEditingRow({ orderKey: null, rowIndex: null, isPending: false })}>Cancel</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={i}>
                      <td>{item.productName}</td>
                      <td>{item.originalQty || item.qty} {item.unit}</td>
                      <td>{item.weight || '-'}</td>
                      <td>{item.less || '-'}</td>
                      <td>₹{item.price}</td>
                      <td>
                        {(isAuthorizedUser(userName) || userName === user) && (
                          <>
                            <button onClick={() => startEditRow(key, item, i)}>Edit</button>
                            <button onClick={() => deleteRow(user, orderId, i)}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        ))
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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Available Qty</th>
                  <th>Sell Qty</th>
                  <th>Weight</th>
                  <th>Price</th>
                  <th>Less</th>
                </tr>
              </thead>
              <tbody>
                {(editOrderData.items || []).map((item, idx) => {
                  const avail = +item.qty,
                    sell = +item.sellQty || 0,
                    showRemark = sell > avail;
                  return (
                    <tr key={idx} className={item.isPending ? 'pending-row' : ''}>
                      <td>{item.productName}</td>
                      <td>{item.qty} {item.unit}</td>
                      <td style={{ position: 'relative' }}>
                        {showRemark && <div style={{ color: 'red', fontSize: '12px', marginBottom: '2px' }}>Greater than available qty</div>}
                        <input
                          type="number"
                          value={item.sellQty}
                          style={{ width: '80px' }}
                          required
                          onChange={e => {
                            const up = [...editOrderData.items];
                            up[idx].sellQty = e.target.value;
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
              <button onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ViewOrder;