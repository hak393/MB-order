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
  const [expandedOrder, setExpandedOrder] = useState(null);
const now = new Date();
const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();




  // Editing row info now includes isPending flag for pending rows
  const [editingRow, setEditingRow] = useState({ orderKey: null, rowIndex: null, isPending: false });
  const [editedItem, setEditedItem] = useState(null);

  const navigate = useNavigate();
  const isAuthorizedUser = name => ['huzaifa bhai', 'ammar bhai', 'shop'].includes(name.toLowerCase());
  const isAuthorizedAdd = name => ['huzaifa bhai', 'ammar bhai', 'shop'].includes(name.toLowerCase());



  // 🔹 1. Effect for loading orders only
  useEffect(() => {
    const storedUser = localStorage.getItem('userName');
    if (!storedUser) {
      showAlert('User not found. Please log in again.');
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
      flat.sort((a, b) => new Date(a.orderData.timestamp) - new Date(b.orderData.timestamp));
      setOrders(flat);
    });

    return () => unsub();
  }, [navigate]);

  // 🔹 2. Effect for transportName when modal opens
  useEffect(() => {
  if (!showModal || !editOrderData?.orderId || !editOrderData?.user) return;

  const fetchTransportName = async () => {
    try {
      const snapshot = await get(ref(db, `orders/${editOrderData.user}/${editOrderData.orderId}/transportName`));
      if (snapshot.exists()) {
        setTransportName(snapshot.val());
      } else {
        setTransportName(""); // default empty if none saved
      }
    } catch (error) {
      console.error("Error fetching transportName:", error);
    }
  };

  fetchTransportName();
}, [showModal, editOrderData?.orderId, editOrderData?.user]);





  const handleSellOrder = async (user, customerName, orderData, orderId) => {
  // Fetch transportName from the order's owner
  let transportNameFromDB = "";
  try {
    const snapshot = await get(ref(db, `orders/${user}/${orderId}/transportName`));
    if (snapshot.exists()) transportNameFromDB = snapshot.val();
  } catch (err) {
    console.error("Error fetching transportName:", err);
  }

  const normalItems = (orderData.items || []).map(i => ({
    ...i,
    sellQty: i.soldQty ?? i.sellQty ?? "",
    isPending: false
  }));

  const pendingItems = (orderData.pendingOrderRows || []).map(i => ({
    ...i,
    sellQty: i.soldQty ?? i.sellQty ?? "",
    isPending: true
  }));

  const combinedItems = [...pendingItems, ...normalItems];

  setEditOrderData({
    user, // original order owner
    customerName,
    city: orderData.city,
    items: combinedItems,
    orderId,
    transportName: transportNameFromDB || "",
    orderData
  });

  setTransportName(transportNameFromDB || "");
  setShowModal(true);
};


  const handleKeyDown = (e, rowIdx = null, colName = null) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();

    // ✅ Special cases
    if (colName === "transportName") {
      // Focus first Sell Qty input
      const firstSellInput = document.querySelector(`input[data-row="0"][data-col="sellQty"]`);
      if (firstSellInput) firstSellInput.focus();
      return;
    } else if (colName === "packet") {
      // Move to next row Sell Qty if exists
      const items = editOrderData.items || [];
      const nextRowIdx = rowIdx + 1;

      if (nextRowIdx < items.length) {
        const nextSellInput = document.querySelector(`input[data-row="${nextRowIdx}"][data-col="sellQty"]`);
        if (nextSellInput) {
          nextSellInput.focus();
        } else {
          // fallback: focus first input in next row
          const nextRow = document.querySelector(`tr:nth-child(${nextRowIdx + 1})`);
          if (nextRow) {
            const firstInput = nextRow.querySelector('input');
            if (firstInput) firstInput.focus();
          }
        }
      } else {
        // ✅ If no next row, focus Sell Order button
        const sellOrderBtn = document.getElementById("sellOrderBtn");
        if (sellOrderBtn) sellOrderBtn.focus();
      }
      return;
    }

    // ✅ Default behavior: navigate within current row inputs + first button
    const row = e.target.closest('tr');
    if (!row) return;

    const inputsAndButton = [
      ...Array.from(row.querySelectorAll('input')),
      row.querySelector('button') // Save button
    ].filter(Boolean);

    const currentIndex = inputsAndButton.indexOf(e.target);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + 1) % inputsAndButton.length;
    inputsAndButton[nextIndex].focus();
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

    // Split items into sell and pending
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
        pendingItems.push({
          ...i,
          originalQty: avail,
          soldQty: 0,
          remainingQty: avail
        });
      }
    });

    // Fetch customer phone
    let phoneNumber = '-';
    try {
      const snapshot = await get(ref(db, 'customers'));
      if (snapshot.exists()) {
        const customers = snapshot.val();
        for (let key in customers) {
          if (customers[key].name === customerName) {
            phoneNumber = customers[key].number || '-';
            break;
          }
        }
      }
    } catch (err) {
      console.error("Error fetching customer phone:", err);
    }

    // Fetch & increment challanCounter in Firebase


    // Only print + push sellOrders if sold items exist
    // Only print + push sellOrders if sold items exist
    if (sellItems.length > 0) {
      // ✅ Fetch & increment challanCounter only when printing
      let newChallanNo = "01";
      try {
        const counterRef = ref(db, 'challanCounter/lastNo');
        const snapshot = await get(counterRef);
        let lastNo = snapshot.exists() ? snapshot.val() : 0;
        lastNo = parseInt(lastNo, 10) || 0;
        newChallanNo = String(lastNo + 1).padStart(2, "0");

        // ✅ Update lastNo in Firebase
        await update(ref(db, 'challanCounter'), { lastNo: lastNo + 1 });
      } catch (err) {
        console.error("Error updating challanCounter:", err);
      }

      await printSoldItems(customerName, city, sellItems, phoneNumber, transportName, newChallanNo);


      await push(ref(db, 'sellOrders'), {
  user,
  customerName,
  city,
  transportName: transportName || '',
  challanNo: newChallanNo,
  timestamp: localISO, // ✅ ALWAYS use current timestamp
  items: sellItems.map(i => ({
    productName: i.productName,
    originalQty: i.originalQty,
    soldQty: i.soldQty,
    unit: i.unit,
    weight: i.weight,
    price: i.price,
    less: i.less,
    packet: i.packet || '',
    kgRate: i.kgRate || ''
  }))
});


      // Remaining qty > 0 goes to pending
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

    // Push pending rows
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
    kgrate: i.kgrate || '',
    timestamp: localISO,  // ✅ Use same current date
  });
}
    // Remove original order
    await remove(ref(db, `orders/${user}/${orderId}`));
    setOrders(p => p.filter(o => !(o.user === user && o.orderId === orderId)));
    setShowModal(false);
  };


  const cleanProductName = n => n.replace(/\s*\([^)]*\)/g, '').trim();


const printSoldItems = (customerName, city, sold, phoneNumber, transportName, challanNo) => {
  const today = new Date();
  const date = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

  const tbodyHTML = (sold || [])
    .map(
      (i, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${cleanProductName(i.productName)}</td>
        <td>${i.soldQty} ${i.unit || ""}</td>
        <td>${i.weight ? parseFloat(i.weight).toFixed(3) : '-'}</td>
        <td>${i.price}</td>
        <td>${typeof i.less === 'number' || (typeof i.less === 'string' && !isNaN(Number(i.less)))
          ? i.less + '%'
          : i.less || '-'
        }</td>
        <td>${i.packet || '-'}</td>
      </tr>
    `
    )
    .join('');

  const headerHTML = `
    <div style="display:flex; justify-content:space-between; width:100%; font-size:20px;">
      <div><strong>Customer:</strong> ${customerName}</div>
      <div><strong>Challan No.:</strong> ${challanNo || '-'}</div>
    </div>
    <div style="display:flex; justify-content:space-between; width:100%; font-size:20px;">
      <div><strong>City:</strong> ${city}</div>
      <div><strong>Date:</strong> ${date}</div>
    </div>
    <div style="display:flex; justify-content:space-between; width:100%; font-size:12px; margin-top:5px;">
      <div><strong>Phone:</strong> ${phoneNumber || '-'}</div>
      <div><strong>Transport:</strong> ${transportName || '-'}</div>
    </div>
  `;

  const w = window.open('', '_blank', 'width=900,height=650');
  if (!w) {
    alert("Popup blocked! Please allow popups for this site.");
    return;
  }

  w.document.write(`
  <html>
  <head>
    <title>Packing Slip</title>
    <style>
  @page { size: A5 landscape; margin: 10mm; }
  thead { display: table-header-group; }
  body { font-family: Arial, sans-serif; padding: 20px; transform: scale(0.85); transform-origin: top left; }
  h2 { text-align: center; margin-bottom: 5px; }
  .copy-title { text-align:center; font-size:14px; font-weight:bold; margin-bottom:10px; }
  .order-header { margin-bottom: 15px; font-size: 14px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
  th, td { border: 1px solid #000; padding: 6px; text-align: center; }
  /* ✅ Original Copy page numbering */
  .original .page-number:after { counter-increment: page; content: "Page " counter(page); }
  /* ✅ Duplicate Copy uses same page number as original */
  .duplicate .page-number:after { content: attr(data-page); }
</style>

  </head>
  <body>
    <!-- Original Copy -->
    <div class="copy-title">Original Copy</div>
   <div class="original">
  <table>
    <thead>
      <tr>
        <th colspan="7">
          <div style="display:flex; justify-content:center; align-items:center; position:relative; width:100%;">
            <h2 style="margin:0; flex:1; text-align:center;">PACKING SLIP</h2>
            <span class="page-number" style="position:absolute; right:0;"></span>
          </div>
        </th>
      </tr>
        <tr>
          <th colspan="7"><div class="order-header">${headerHTML}</div></th>
        </tr>
        <tr>
          <th>Sr No.</th>
          <th>Product</th>
          <th>Qty</th>
          <th>Weight</th>
          <th>Price</th>
          <th>Less</th>
          <th>Packet</th>
        </tr>
      </thead>
      <tbody>${tbodyHTML}</tbody>
    </table>
    </div>

    <div style="page-break-before: always;"></div>

    <!-- Duplicate Copy -->
    <div class="copy-title">Duplicate Copy</div>
    <div class="duplicate">
  <table>
    <thead>
      <tr>
        <th colspan="7">
          <div style="display:flex; justify-content:center; align-items:center; position:relative; width:100%;">
            <h2 style="margin:0; flex:1; text-align:center;">PACKING SLIP</h2>
            <span class="page-number" style="position:absolute; right:0;" data-page="Page 1"></span>
          </div>
        </th>
      </tr>
        <tr>
          <th colspan="7"><div class="order-header">${headerHTML}</div></th>
        </tr>
        <tr>
          <th>Sr No.</th>
          <th>Product</th>
          <th>Qty</th>
          <th>Weight</th>
          <th>Price</th>
          <th>Less</th>
          <th>Packet</th>
        </tr>
      </thead>
      <tbody>${tbodyHTML}</tbody>
    </table>
    </div>

    <script>
      window.onload = () => {
        window.print();
        window.onafterprint = () => window.close();
      };
    </script>
  </body>
  </html>
  `);

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
      qty: item.packet || item.qty,
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

        // ✅ Same multiplication logic as pending rows
        // ✅ Inside saveRowEdit
        const match = updatedItem.productName?.match(/\((\d+)\s*([a-zA-Z]+)\)/i);
        if (match && updatedItem.qty) {
          const pcsPerPacket = parseInt(match[1], 10);   // e.g. 50
          const unit = match[2] || "";                   // e.g. "pair"

          updatedItem.packet = updatedItem.qty;          // user input = packet
          updatedItem.qty = updatedItem.packet * pcsPerPacket;  // multiply
          updatedItem.unit = unit;                       // set unit
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

    // Ensure qty shows the packet value (if packet exists) so the edit input behaves like normal rows.
    setEditedItem({
      ...item,
      qty: item.packet !== undefined && item.packet !== null && item.packet !== "" ? item.packet : item.qty,
      packet: item.packet !== undefined && item.packet !== null && item.packet !== "" ? item.packet : item.qty
    });
  };

  const savePendingRowEdit = async (user, orderId, idx) => {
    const pendingRef = ref(db, `orders/${user}/${orderId}/pendingOrderRows`);
    onValue(pendingRef, async snap => {
      const pendingItems = snap.val();
      if (Array.isArray(pendingItems)) {
        let updatedItem = { ...editedItem };
        if (updatedItem.qty !== undefined && updatedItem.qty !== null && updatedItem.qty !== "") {
          updatedItem.packet = updatedItem.qty;
        }
        // ✅ Apply same logic for pending rows
        // ✅ Inside saveRowEdit
        const match = updatedItem.productName?.match(/\((\d+)\s*([a-zA-Z]+)\)/i);
        if (match && updatedItem.qty) {
          const pcsPerPacket = parseInt(match[1], 10);
          const unit = match[2] || "";

          updatedItem.packet = updatedItem.qty;
          updatedItem.qty = updatedItem.packet * pcsPerPacket;
          updatedItem.unit = unit;
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

    // ✅ Format timestamp as dd/mm/yyyy (remove time)
    let formattedDate = '';
    if (orderData.timestamp) {
      const d = new Date(orderData.timestamp);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      formattedDate = `${day}/${month}/${year}`;
    }

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
                <th colspan="5" style="text-align:right;">
                  <span class="page-number"></span>
                </th>
            </tr>
            <tr>
                <th colspan="5">
                    <h2>Order Summary</h2>
                    <div><strong>Customer:</strong> ${customerName}</div>
                    <div><strong>City:</strong> ${orderData.city}</div>
                    <div><strong>Date:</strong> ${formattedDate}</div>
                </th>
            </tr>
            <tr>
                <th>SR NO.</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Packet</th>
                <th>Check</th>
            </tr>
        </thead>
        <tbody>
          ${combinedRows.map((i, index) => `
            <tr class="${i.isPending ? 'pending-row' : ''}">
              <td>${index + 1}</td>
              <td>${cleanProductName(i.productName)}</td>
              <td>${i.originalQty || i.qty} ${i.unit || ''}</td>
              <td>${i.packet || '-'}</td>
              <td></td>
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
                <div><strong>Placed On:</strong>{
  new Date(orderData.timestamp).toLocaleDateString('en-GB')
}</div>

              </div>
              {(isAuthorizedAdd(userName) || userName === user) && (
                <div className="order-action">
                  {/* ✅ Change Add button to open modal */}
                  <button onClick={() => handleAddOrder(orderId)}>Add</button>
                </div>
              )}
              {isAuthorizedUser(userName) && (
  <div className="order-action">
    <button onClick={() => handleSellOrder(user, customerName, orderData, orderId)}>Sell</button>
    <button
      style={{ marginTop: '10px' }}
      onClick={() => previewAndPrint({ user, customerName, orderData })}
    >
      Print
    </button>
  </div>
)}

{/* ✅ Expand/Collapse Button (allowed for all users) */}
<div className="order-action">
  <button
    style={{ marginTop: '10px' }}
    onClick={() => setExpandedOrder(prev => prev === orderId ? null : orderId)}
  >
    {expandedOrder === orderId ? "▲" : "▼"}
  </button>
</div>

</div>

{/* ✅ Table shows only when expanded */}
{expandedOrder === orderId && (
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
                          onKeyDown={handleKeyDown}
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
                          onKeyDown={handleKeyDown}
                        />
                      </td>
                      <td>
  {(editedItem.less?.includes("%") || !editedItem.less) ? (
    <div style={{ display: "flex", alignItems: "center" }}>
      <input
  type="number"
  value={
    editedItem.less
      ? editedItem.less.toString().trim().replace("%", "").trim()
      : ""
  }
  onChange={e =>
    setEditedItem({ ...editedItem, less: e.target.value + "%" })
  }
  style={{
    width: "60px",
    fontSize: "14px",
    padding: "4px",
    border: "1px solid #ccc",
    borderRadius: "4px 0 0 4px",
    outline: "none"
  }}
  onBlur={e => {
    let val = e.target.value.trim();
    if (!val) val = "0";
    if (!val.includes("%")) val = val + "%";
    setEditedItem({ ...editedItem, less: val });
  }}
  onKeyDown={handleKeyDown}
/>

      <select
        value="%"
        onChange={e => {
          if (e.target.value === "%") {
            // ✅ Keep existing % value from Firebase if present
            const currentLess =
              editedItem.less && editedItem.less.includes("%")
                ? editedItem.less
                : "0%";
            setEditedItem({ ...editedItem, less: currentLess });
          } else {
            setEditedItem({ ...editedItem, less: e.target.value });
          }
        }}
        style={{
          fontSize: "14px",
          padding: "4px",
          border: "1px solid #ccc",
          borderLeft: "none",
          borderRadius: "0 4px 4px 0",
          backgroundColor: "#f9f9f9",
          cursor: "pointer",
          width: "90px"
        }}
      >
        <option value="%">%</option>
        <option value="NET">NET</option>
        <option value="Pair">Pair</option>
        <option value="Full Bill">Full Bill</option>
        <option value="Half Bill">Half Bill</option>
      </select>
    </div>
  ) : (
    <select
      value={editedItem.less} // show exact value from Firebase
      onChange={e => {
        if (e.target.value === "%") {
          setEditedItem({ ...editedItem, less: "0%" });
        } else {
          setEditedItem({ ...editedItem, less: e.target.value });
        }
      }}
      style={{
        width: "120px",
        fontSize: "14px",
        padding: "4px",
        borderRadius: "4px",
        border: "1px solid #ccc",
        backgroundColor: "#fff",
        cursor: "pointer"
      }}
      onKeyDown={handleKeyDown}
    >
      <option value="%">%</option>
      <option value="NET">NET</option>
      <option value="Pair">Pair</option>
      <option value="Full Bill">Full Bill</option>
      <option value="Half Bill">Half Bill</option>
      {!["%", "NET", "Pair", "Full Bill", "Half Bill"].includes(editedItem.less) && (
        <option value={editedItem.less}>{editedItem.less}</option>
      )}
    </select>
  )}
</td>




                      <td>
                        <input
                          type="number"
                          value={editedItem.price}
                          onChange={e => setEditedItem({ ...editedItem, price: e.target.value })}
                          style={{ width: '60px', fontSize: '14px' }}
                          onKeyDown={handleKeyDown}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editedItem.packet || ''}
                          onChange={e => setEditedItem({ ...editedItem, packet: e.target.value })}
                          style={{ width: '60px', fontSize: '14px' }}
                          onKeyDown={handleKeyDown}
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
                          onKeyDown={handleKeyDown}
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
                          onKeyDown={handleKeyDown}
                        />
                      </td>
                      <td>
                        {editedItem.less?.includes("%") || !editedItem.less ? (
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <input
  type="number"
  value={
    editedItem.less
      ? editedItem.less.toString().trim().replace("%", "").trim()
      : ""
  }
  onChange={e =>
    setEditedItem({ ...editedItem, less: e.target.value + "%" })
  }
  style={{
    width: "60px",
    fontSize: "14px",
    padding: "4px",
    border: "1px solid #ccc",
    borderRadius: "4px 0 0 4px",
    outline: "none"
  }}
  onBlur={e => {
    let val = e.target.value;
    if (!val) val = "0";
    if (!val.includes("%")) val += "%";
    setEditedItem({ ...editedItem, less: val });
  }}
  onKeyDown={handleKeyDown}
/>

                            <select
                              value="%"
                              onChange={e => {
                                if (e.target.value === "%") {
                                  if (!editedItem.less || !editedItem.less.includes("%")) {
                                    setEditedItem({ ...editedItem, less: "0%" });
                                  }
                                } else {
                                  setEditedItem({ ...editedItem, less: e.target.value });
                                }
                              }}
                              style={{
                                fontSize: "14px",
                                padding: "4px",
                                border: "1px solid #ccc",
                                borderLeft: "none",
                                borderRadius: "0 4px 4px 0",
                                backgroundColor: "#f9f9f9",
                                cursor: "pointer",
                                width: "90px"
                              }}
                            >
                              <option value="%">%</option>
                              <option value="NET">NET</option>
                              <option value="Pair">Pair</option>
                              <option value="Full Bill">Full Bill</option>
                              <option value="Half Bill">Half Bill</option>
                            </select>
                          </div>
                        ) : (
                          <select
                            value={editedItem.less} // ✅ Use exact value from Firebase
                            onChange={e => {
                              if (e.target.value === "%") {
                                setEditedItem({ ...editedItem, less: "0%" });
                              } else {
                                setEditedItem({ ...editedItem, less: e.target.value });
                              }
                            }}
                            style={{
                              width: "120px",
                              fontSize: "14px",
                              padding: "4px",
                              borderRadius: "4px",
                              border: "1px solid #ccc",
                              backgroundColor: "#fff",
                              cursor: "pointer"
                            }}
                            onKeyDown={handleKeyDown}
                          >
                            {/* Predefined options */}
                            <option value="%">%</option>
                            <option value="NET">NET</option>
                            <option value="Pair">Pair</option>
                            <option value="Full Bill">Full Bill</option>
                            <option value="Half Bill">Half Bill</option>

                            {/* ✅ Add Firebase value if not present in options */}
                            {!["%", "NET", "Pair", "Full Bill", "Half Bill"].includes(editedItem.less) && (
                              <option value={editedItem.less}>{editedItem.less}</option>
                            )}
                          </select>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editedItem.price}
                          onChange={e => setEditedItem({ ...editedItem, price: e.target.value })}
                          style={{ width: '60px', fontSize: '14px' }}
                          onKeyDown={handleKeyDown}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editedItem.packet || ''}
                          onChange={e => setEditedItem({ ...editedItem, packet: e.target.value })}
                          style={{ width: '60px', fontSize: '14px' }}
                          onKeyDown={handleKeyDown}
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
                      <td>{item.qty} {item.unit}</td>
                      <td>{item.sellQty || 0} {item.unit}</td> {/* ✅ Sold Qty with Unit */}
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
)}

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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const firstSellInput = document.querySelector('input[data-row="0"][data-col="sellQty"]');
                    if (firstSellInput) firstSellInput.focus();
                  }
                }}
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
                {(editOrderData.items || []).map((item, idx) => (
                  <tr key={idx} className={item.isPending ? 'pending-row' : ''}>
                    <td>{item.productName}</td>
                    <td>{item.qty} {item.unit}</td>
                    <td>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.sellQty ?? ''} // ✅ allows 0
                        style={{ width: '80px' }}
                        data-row={idx}
                        data-col="sellQty"
                        onChange={e => {
                          const value = e.target.value;
                          const sellQty = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
                          const up = [...editOrderData.items];
                          up[idx].sellQty = sellQty;

                          const weight = parseFloat(up[idx].weight) || 0;
                          const kgRate = parseFloat(up[idx].kgRate) || 0;

                          // ✅ Only calculate price if kgRate is filled and sellQty > 0
                          if (kgRate > 0 && sellQty > 0) {
                            up[idx].price = Math.ceil((weight * kgRate) / sellQty);
                          }

                          setEditOrderData({ ...editOrderData, items: up });
                        }}
                        onKeyDown={(e) => handleKeyDown(e, idx, "sellQty")}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        value={item.weight ?? ''}
                        style={{ width: '70px' }}
                        data-row={idx}
                        data-col="weight"
                        onChange={e => {
                          const weight = parseFloat(e.target.value) || 0;
                          const up = [...editOrderData.items];
                          up[idx].weight = weight;
                          const kgRate = parseFloat(up[idx].kgRate) || 0;
                          const sellQty = parseFloat(up[idx].sellQty) || 1;
                          up[idx].price = Math.ceil(weight * kgRate / sellQty);
                          setEditOrderData({ ...editOrderData, items: up });
                        }}
                        onKeyDown={(e) => handleKeyDown(e, idx, "less")}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={item.kgRate ?? ''}
                        style={{ width: '70px' }}
                        data-row={idx}
                        data-col="kgRate"
                        onChange={e => {
                          const kgRate = parseFloat(e.target.value) || 0;
                          const up = [...editOrderData.items];
                          up[idx].kgRate = kgRate;
                          const weight = parseFloat(up[idx].weight) || 0;
                          const sellQty = parseFloat(up[idx].sellQty) || 1;
                          up[idx].price = Math.ceil(weight * kgRate / sellQty);
                          setEditOrderData({ ...editOrderData, items: up });
                        }}
                        onKeyDown={(e) => handleKeyDown(e, idx, "less")}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.price}
                        style={{ width: '70px' }}
                        required
                        data-row={idx}
                        data-col="price"
                        onChange={e => {
                          const up = [...editOrderData.items];
                          up[idx].price = e.target.value;
                          setEditOrderData({ ...editOrderData, items: up });
                        }}
                        onKeyDown={(e) => handleKeyDown(e, idx, "price")}
                      />
                    </td>
                    <td>
                      {(item.less?.includes("%") || !item.less) ? (
                        // ✅ Show input + select combo when % or empty
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <input
                            type="number"
                            value={
  item.less
    ? item.less.toString().trim().replace("%", "").trim()
    : ""
}

                            // default 0 if empty
                            onChange={e => {
                              const up = [...editOrderData.items];
                              let val = e.target.value;
                              up[idx].less = val !== "" ? `${val}%` : "0%"; // ✅ strips leading 0s
                              setEditOrderData({ ...editOrderData, items: up });
                            }}
                            style={{
                              width: "60px",
                              fontSize: "14px",
                              padding: "4px",
                              border: "1px solid #ccc",
                              borderRadius: "4px 0 0 4px",
                              outline: "none"
                            }}
                            onBlur={e => {
                              const up = [...editOrderData.items];
                              let val = e.target.value;
                              if (val === "") val = "0%";
                              else if (!val.includes("%")) val = parseFloat(val) + "%"; // ✅ prevents 045.65

                              up[idx].less = val;
                              setEditOrderData({ ...editOrderData, items: up });
                            }}
                            onKeyDown={e => handleKeyDown(e, idx, "less")}
                          />
                          <select
                            value={
                              ["%", "NET", "Pair", "Full Bill", "Half Bill"].includes(item.less)
                                ? item.less
                                : "%"
                            }
                            onChange={e => {
                              const up = [...editOrderData.items];
                              const val = e.target.value;
                              if (val === "%") {
                                if (!up[idx].less || !up[idx].less.includes("%")) {
                                  up[idx].less = "0%";
                                }
                              } else {
                                up[idx].less = val; // NET / Pair / Full Bill / Half Bill
                              }
                              setEditOrderData({ ...editOrderData, items: up });
                            }}
                            style={{
                              fontSize: "14px",
                              padding: "4px",
                              border: "1px solid #ccc",
                              borderLeft: "none",
                              borderRadius: "0 4px 4px 0",
                              backgroundColor: "#f9f9f9",
                              cursor: "pointer",
                              width: "90px"
                            }}
                          >
                            <option value="%">%</option>
                            <option value="NET">NET</option>
                            <option value="Pair">Pair</option>
                            <option value="Full Bill">Full Bill</option>
                            <option value="Half Bill">Half Bill</option>
                          </select>
                        </div>
                      ) : (
                        // ✅ Normal select when not % (also shows any value from Firebase)
                        <select
                          value={item.less} // ✅ show exact value from Firebase
                          onChange={e => {
                            const up = [...editOrderData.items];
                            if (e.target.value === "%") {
                              up[idx].less = "0%";
                            } else {
                              up[idx].less = e.target.value;
                            }
                            setEditOrderData({ ...editOrderData, items: up });
                          }}
                          style={{
                            width: "120px",
                            fontSize: "14px",
                            padding: "4px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            backgroundColor: "#fff",
                            cursor: "pointer"
                          }}
                          onKeyDown={e => handleKeyDown(e, idx, "less")}
                        >
                          <option value="%">%</option>
                          <option value="NET">NET</option>
                          <option value="Pair">Pair</option>
                          <option value="Full Bill">Full Bill</option>
                          <option value="Half Bill">Half Bill</option>
                          {/* ✅ show Firebase value if not in predefined options */}
                          {!["%", "NET", "Pair", "Full Bill", "Half Bill"].includes(item.less) && (
                            <option value={item.less}>{item.less}</option>
                          )}
                        </select>
                      )}
                    </td>






                    <td>
                      <input
                        type="text"
                        value={item.packet || ''}
                        style={{ width: '70px' }}
                        data-row={idx}
                        data-col="packet"
                        onChange={e => {
                          const up = [...editOrderData.items];
                          up[idx].packet = e.target.value;
                          setEditOrderData({ ...editOrderData, items: up });
                        }}
                        onKeyDown={(e) => handleKeyDown(e, idx, "packet")}
                      />
                    </td>


                  </tr>
                ))}
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
              <button
                id="sellOrderBtn"
                onClick={saveEdit}
                style={{ marginRight: '10px' }}
              >
                Sell Order
              </button>

              <button
                onClick={async () => {
                  if (!editOrderData) return;
                  const { user, orderId, orderData, items } = editOrderData;
                  const updatedItems = (items || []).map(item => ({
                    ...item,
                    sellQty: item.sellQty ?? "",
                    less: item.less ?? "",
                    price: item.price ?? 0,
                    packet: item.packet ?? "",
                    kgRate: item.kgRate ?? "" 
                  }));
                  try {
                    // ✅ Keep all rows intact
                    const normalItems = updatedItems.filter(i => !i.isPending);
                    const pendingItems = updatedItems.filter(i => i.isPending);

                    await update(ref(db, `orders/${user}/${orderId}`), {
                      ...orderData,
                      transportName: transportName || "",
                      items: normalItems,
                      pendingOrderRows: pendingItems
                    });

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