import React, { useEffect, useState, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { query, orderByChild, equalTo } from "firebase/database"; // at top
import { getDatabase, ref, onValue, update, get, remove, push} from 'firebase/database'; // ⬅ added get
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
  const [lastChallanNo, setLastChallanNo] = useState("00"); // ✅ new state
  const [editingOrder, setEditingOrder] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
});

  const printRefs = useRef({});

  useEffect(() => {
    const sellOrdersRef = ref(db, 'sellOrders');
    return onValue(sellOrdersRef, (snap) => {
      const data = snap.val();
      const formatted = data
        ? Object.keys(data).map((key) => ({ id: key, ...data[key] }))
        : [];

      formatted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const monthMap = {};
      const withChallan = formatted.map((order) => {
  if (!order.challanNo) {
    // only assign a challan number if missing
    const date = new Date(order.timestamp);
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    monthMap[monthKey] = (monthMap[monthKey] || 0) + 1;
    const challanNo = monthMap[monthKey].toString().padStart(2, '0');

    update(ref(db, `sellOrders/${order.id}`), { challanNo });
    return { ...order, challanNo };
  }

  // ✅ keep existing challan number
  return order;
});


      // ✅ Get the last challan number (max challanNo across all)
      if (withChallan.length > 0) {
  const maxChallan = Math.max(
    ...withChallan.map(o => parseInt(o.challanNo, 10) || 0)
  );
  setLastChallanNo(maxChallan.toString().padStart(2, "0"));
  // ✅ also update challanCounter section in Firebase
  update(ref(db, "challanCounter"), { lastNo: maxChallan });
} else {
  setLastChallanNo("00");
  // ✅ when last challan is zero, update challanCounter in Firebase too
  update(ref(db, "challanCounter"), { lastNo: 0 });
}


      withChallan.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setSellOrders(withChallan);
    });
  }, []);


  const handlePrint = async (id) => {
    // ✅ Decode HTML entities like &amp;, &nbsp;, etc.
const decodeHTML = (text) => {
  const temp = document.createElement("textarea");
  temp.innerHTML = text;
  return temp.value;
};

  const content = printRefs.current[id];
  if (!content) return;
  const printCopies = ["Original Copy", "Duplicate Copy"];

  // ✅ Find the order object from state
  const order = sellOrders.find(o => o.id === id);

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
  (c) =>
    decodeHTML(c.name)?.trim().toLowerCase() ===
      decodeHTML(customerName)?.trim().toLowerCase() &&
    decodeHTML(c.city)?.trim().toLowerCase() ===
      decodeHTML(city)?.trim().toLowerCase()
);


      if (found?.number) phoneNumber = found.number;
    }
  } catch (err) {
    console.error("Error fetching phone:", err);
  }

  // ✅ Fetch transport name from Firebase sellOrders
  let transportName = "-";
  try {
    const ordersRef = ref(db, "sellOrders");
    const snap = await get(ordersRef);
    if (snap.exists()) {
      const orders = snap.val();
      const foundOrder = Object.values(orders).find(
  (o) =>
    decodeHTML(o.customerName)?.trim().toLowerCase() ===
      decodeHTML(customerName)?.trim().toLowerCase() &&
    decodeHTML(o.city)?.trim().toLowerCase() ===
      decodeHTML(city)?.trim().toLowerCase()
);


      if (foundOrder?.transportName) transportName = foundOrder.transportName;
    }
  } catch (err) {
    console.error("Error fetching transport name:", err);
  }

  // ✅ Build header HTML
  const orderDate = order.timestamp || order.date || order.createdAt || ""; 
let formattedDate = "-";

if (orderDate) {
  const d = new Date(orderDate);
  formattedDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

  const headerHTML = `
    <div style="display:flex; justify-content:space-between; width:100%; font-size:20px;">
      <div><strong>Customer:</strong> ${customerName}</div>
      <div><strong>Challan No.:</strong> ${order.challanNo || '-'}</div>
    </div>
    <div style="display:flex; justify-content:space-between; width:100%; font-size:20px;">
      <div><strong>City:</strong> ${city}</div>
      <div><strong>Date:</strong> ${formattedDate}</div>
    </div>
    <div style="display:flex; justify-content:space-between; width:100%; font-size:12px; margin-top:5px;">
      <div><strong>Phone:</strong> ${phoneNumber}</div>
      <div><strong>Transport:</strong> ${transportName}</div>
    </div>
  `;

  // ✅ Build table rows
  const rows = Array.from(content.querySelectorAll("tbody tr"));
  const tbodyHTML = rows
    .map((row, idx) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 6) return "";

      const product = cells[0].innerHTML.replace(/\s*\(.*?\)/g, "").trim();
      const soldQty = cells[1].innerHTML;
      const weightValue = parseFloat(cells[2].innerHTML);
const weight = isNaN(weightValue) ? "" : weightValue.toFixed(3);
 // ✅ always 3 decimal places
      const less = cells[3].innerHTML.replace(/₹/g, "");
      const price = cells[4].innerHTML.replace(/₹/g, "");
      const packet = cells[5].innerHTML;

      return `<tr>
        <td>${idx + 1}</td>
        <td>${product}</td>
        <td>${soldQty}</td>
        <td>${weight}</td>
        <td>${price}</td>
        <td>${less}</td>
        <td>${packet}</td>
      </tr>`;
    })
    .join("");

  const printWindow = window.open("", "", "width=900,height=650");
  if (!printWindow) {
    alert("Popup blocked! Please allow popups for this site.");
    return;
  }

  printWindow.document.write(`
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
      </body>
      <script>
        window.onload = () => {
          window.print();
          window.onafterprint = () => window.close();
        };
      </script>
    </html>
  `);

  printWindow.document.close();
};



const handleEdit = async (order) => {
  setEditingOrder(order);

  const updatedItems = await Promise.all(order.items.map(async (item) => {
    // Use existing kgRate from Firebase
    const existingKgRate = item.kgRate || "";

    // Fallback: fetch from products if needed
    if (!existingKgRate && item.productName) {
      try {
        const productsQuery = query(
          ref(db, "products"),
          orderByChild("name"),
          equalTo(item.productName.trim())
        );
        const snap = await get(productsQuery);
        if (snap.exists()) {
          const productData = Object.values(snap.val())[0];
          return { ...item, kgRate: productData.kgRate || "" };
        }
      } catch (err) {
        console.error("Error fetching kgRate:", err);
      }
    }

    return { ...item, kgRate: existingKgRate };
  }));

  setEditItems(updatedItems);
};





  const handleKeyDown = (e, rowIndex, col) => {
    const cols = ['originalQty', 'soldQty', 'weight', 'less', 'price', 'packet']; // skip 'productName'
    const currentColIndex = cols.indexOf(col);

    if (e.key === 'Enter') {
      e.preventDefault();
      let nextRow = rowIndex;
      let nextColIndex = currentColIndex + 1;

      // Move to next row if we are at the last column
      if (nextColIndex >= cols.length) {
        nextColIndex = 0;
        nextRow = rowIndex + 1;
        if (nextRow >= editItems.length) nextRow = 0; // loop to first row
      }

      const nextCol = cols[nextColIndex];
      const nextInput = document.querySelector(
        `input[data-row="${nextRow}"][data-col="${nextCol}"]`
      );
      if (nextInput) nextInput.focus();
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...editItems];
    updated[index][field] = value;
    setEditItems(updated);
  };

const handleSave = async () => {
  if (!editingOrder) return;

  const orderRef = ref(db, `sellOrders/${editingOrder.id}`);

  // Loop through edited items and check qty changes
  for (let i = 0; i < editItems.length; i++) {
    const item = editItems[i];
    const oldQty = editingOrder.items[i]?.soldQty || 0; // old sold qty
    const newQty = parseFloat(item.soldQty) || 0;

    // ✅ If qty reduced, move difference to pendingOrders
    if (newQty < oldQty) {
      const remainingQty = oldQty - newQty;

      const pendingData = {
        city: editingOrder.city,
        customerName: editingOrder.customerName,
        kgrate: "",
        less: item.less || "",
        packet: "",
        price: item.price || "",
        productName: item.productName || "",
        remainingQty: remainingQty,
        soldQty: 0,
        timestamp: new Date().toISOString(),
        unit: item.unit || "",
        user: editingOrder.user || ""
      };

      // ✅ Push remaining as new pending order
      await push(ref(db, "pendingOrders"), pendingData);
    }
  }

  // ✅ Now update the main sellOrder with new soldQty values
  await update(orderRef, { items: editItems });

  // ✅ Close editor
  setEditingOrder(null);
  setEditItems([]);
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

      <div style={{ textAlign: 'center', marginBottom: '10px', fontSize: '18px' }}>
        Last Challan No.: <strong>{lastChallanNo}</strong>
      </div>


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
      // ✅ Only remove this order, do NOT update challanCounter or other orders
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
                  <strong>Date:</strong> {(() => {
  const ts = order.timestamp; // "2025-10-24T06:58:00.156Z"
  
  // Extract date and time from the string directly
  const [datePart, timePart] = ts.split("T");
  const [year, month, day] = datePart.split("-");
  const [hour, minute] = timePart.split(":");
  
  // Optional: convert to 12-hour format
  let hours = parseInt(hour);
  const minutesStr = minute;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${day}/${month}/${year} ${hours}:${minutesStr} ${ampm}`;
})()}
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
                  <th>Kg Rate</th>
                  <th>Less</th>
                  <th>Price</th>
                  <th>Packet</th>
                </tr>
              </thead>
              <tbody>
                {editItems.map((item, idx) => (
                  <tr key={idx}>
                    {/* Product name is now read-only */}
                    <td>
                      <input
                        value={item.productName}
                        readOnly
                        style={{ backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.originalQty}
                        data-row={idx}
                        data-col="originalQty"
                        onChange={(e) => handleItemChange(idx, 'originalQty', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 'originalQty')}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.soldQty || ''}
                        data-row={idx}
                        data-col="soldQty"
                        onChange={(e) => handleItemChange(idx, 'soldQty', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 'soldQty')}
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
      let val = e.target.value;

      // Prevent leading zeros like 025
      if (val.startsWith('0') && !val.includes('.')) {
        val = val.replace(/^0+/, '');
      }

      const weight = parseFloat(val) || 0;
      const up = [...editItems]; // your state array
      up[idx].weight = val === '' ? '' : weight; // keep field empty if erased
      const kgRate = parseFloat(up[idx].kgRate) || 0;
      const sellQty = parseFloat(up[idx].soldQty) || 1;
      up[idx].price = val === '' ? 0 : Math.ceil(weight * kgRate / sellQty); // recalc price
      setEditItems(up);
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
      let val = e.target.value;

      // Prevent leading zeros like 025
      if (val.startsWith('0') && !val.includes('.')) {
        val = val.replace(/^0+/, '');
      }

      const kgRate = parseFloat(val) || 0;
      const up = [...editItems]; // your state array
      up[idx].kgRate = val === '' ? '' : kgRate; // keep field empty if erased
      const weight = parseFloat(up[idx].weight) || 0;
      const sellQty = parseFloat(up[idx].soldQty) || 1;
      up[idx].price = val === '' ? 0 : Math.ceil(weight * kgRate / sellQty); // recalc price
      setEditItems(up);
    }}
    onKeyDown={(e) => handleKeyDown(e, idx, "less")}
  />
</td>



                    <td>
  {(item.less?.includes("%") || !item.less) ? (
    // ✅ Show input + select combo when % or empty
    <div style={{ display: "flex", alignItems: "center" }}>
      <input
  type="number"
  value={item.less && item.less.includes("%") ? item.less.replace("%", "") : ""}
  onChange={e => {
    const up = [...editItems];
    let val = e.target.value;
    up[idx].less = val !== "" ? `${val}%` : "%";   // ✅ FIXED HERE
    setEditItems(up);
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
    const up = [...editItems];
    let val = e.target.value;
    if (val === "") val = "%";
    else if (!val.includes("%")) val = `${val}%`;   // ✅ FIXED HERE
    up[idx].less = val;
    setEditItems(up);
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
          const up = [...editItems];
          const val = e.target.value;
          if (val === "%") {
            if (!up[idx].less || !up[idx].less.includes("%")) {
              up[idx].less = "0%";
            }
          } else {
            up[idx].less = val;
          }
          setEditItems(up);
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
        onKeyDown={(e) => handleKeyDown(e, idx, 'less')}
      >
        <option value="%">%</option>
        <option value="NET">NET</option>
        <option value="Pair">Pair</option>
        <option value="Full Bill">Full Bill</option>
        <option value="Half Bill">Half Bill</option>
      </select>
    </div>
  ) : (
    // ✅ Normal select when not %
    <select
      value={item.less}
      onChange={e => {
        const up = [...editItems];
        if (e.target.value === "%") {
          up[idx].less = "0%";
        } else {
          up[idx].less = e.target.value;
        }
        setEditItems(up);
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
      {!["%", "NET", "Pair", "Full Bill", "Half Bill"].includes(item.less) && (
        <option value={item.less}>{item.less}</option>
      )}
    </select>
  )}
</td>

                    <td>
                      <input
                        type="number"
                        value={item.price}
                        data-row={idx}
                        data-col="price"
                        onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 'price')}
                      />
                    </td>
                    <td>
                      <input
                        value={item.packet || ''}
                        data-row={idx}
                        data-col="packet"
                        onChange={(e) => handleItemChange(idx, 'packet', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 'packet')}
                      />
                    </td>
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
