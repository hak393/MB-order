// src/component/ViewItems.jsx
import React, { useEffect, useState } from 'react';
import { database } from '../firebase/firebase';
import { ref, onValue, remove, update , get , child} from 'firebase/database';
import './Style.css';

const ViewItems = () => {
  const [selectedOption, setSelectedOption] = useState('');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editField1, setEditField1] = useState('');
  const [editField2, setEditField2] = useState('');
  const [editField3, setEditField3] = useState('');


  // Fetch data from Firebase when option changes
  // Fetch data from Firebase when option changes
useEffect(() => {
  if (selectedOption) {
    setSearchTerm(""); // ✅ clear search bar on selection change
    setLoading(true);
    const path = selectedOption === 'customer' ? 'customers' : 'products';
    const dataRef = ref(database, path);
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.keys(data).map((id) => {
        if (selectedOption === 'customer') {
          return {
            id,
            name: data[id].name || 'Unknown',
            city: data[id].city || '',
            number: data[id].number || ''
          };
        } else {
          let fullName = data[id].name || 'Unknown';
          let name = fullName;
          let qty = '';

          const match = fullName.match(/^(.*?)\s*\((.*?)\)$/);
          if (match) {
            name = match[1].trim();
            qty = match[2].trim();
          }

          return { id, name, qty };
        }
      });

      if (selectedOption === 'customer') {
        setCustomers(list);
      } else {
        setProducts(list);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  } else {
    setCustomers([]);
    setProducts([]);
  }
}, [selectedOption]);


// helper function
const handleKeyDown = (e) => {
  if (e.key === "Enter") {
    e.preventDefault(); // stop form submit
    const form = e.target.form || document;
    const index = Array.prototype.indexOf.call(form.querySelectorAll("input"), e.target);
    const next = form.querySelectorAll("input")[index + 1];
    if (next) {
      next.focus();
    }
  }
};


  // Delete item from Firebase
  const handleDelete = (id) => {
  // ✅ Custom styled confirmation popup
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

  // ✅ Handle YES click
  document.getElementById("confirmYes").onclick = () => {
    const path = selectedOption === "customer" ? "customers" : "products";
    remove(ref(database, `${path}/${id}`));
    document.body.removeChild(confirmBox);
  };

  // ✅ Handle NO click
  document.getElementById("confirmNo").onclick = () => {
    document.body.removeChild(confirmBox);
  };
};


  // Start editing
const handleEdit = (item) => {
  setEditId(item.id);
  setEditField1(item.name);
  setEditField2(selectedOption === 'customer' ? item.city : item.qty);
  if (selectedOption === 'customer') {
    setEditField3(item.number || ''); // number already includes +91 now
  }
};

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



// Save updated data
// Save updated data
// Save updated data
const handleSave = async (id) => {
  if (selectedOption === 'customer') {
    if (!editField1.trim() || !editField2.trim() || !editField3.trim()) {
      showAlert('Fields cannot be empty');
      return;
    }
    if (!/^\d{10}$/.test(editField3)) {
      showAlert('Number must be exactly 10 digits');
      return;
    }
  } else {
    if (!editField1.trim() || !editField2.trim()) {
      showAlert('Fields cannot be empty');
      return;
    }
  }

  const path = selectedOption === 'customer' ? 'customers' : 'products';
  let updateData;
  // ... rest of your logic remains unchanged

if (selectedOption === 'customer') {
  // ✅ Get old values before updating
  const customerSnap = await get(ref(database, `${path}/${id}`));
  if (!customerSnap.exists()) return;
  const oldData = customerSnap.val();
  const oldName = oldData.name;
  const oldCity = oldData.city;

  // 1️⃣ Update customer in `customers`
updateData = { name: editField1, city: editField2, number: editField3 }; // 🔹 number has +91
await update(ref(database, `${path}/${id}`), updateData);


    // ✅ Update in sellOrders
const sellOrdersSnap = await get(ref(database, 'sellOrders'));
if (sellOrdersSnap.exists()) {
  const updates = {};
  const sellOrders = sellOrdersSnap.val();

  Object.keys(sellOrders).forEach((orderId) => {
    const order = sellOrders[orderId];
    if (order.customerName === oldName && order.city === oldCity) {
      updates[`sellOrders/${orderId}/customerName`] = editField1;
      updates[`sellOrders/${orderId}/city`] = editField2;
    }
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(database), updates);
  }
}

// ✅ Update in pendingOrders
const pendingOrdersSnap = await get(ref(database, 'pendingOrders'));
if (pendingOrdersSnap.exists()) {
  const updates = {};
  const pendingOrders = pendingOrdersSnap.val();

  Object.keys(pendingOrders).forEach((orderId) => {
    const order = pendingOrders[orderId];
    if (order.customerName === oldName && order.city === oldCity) {
      updates[`pendingOrders/${orderId}/customerName`] = editField1;
      updates[`pendingOrders/${orderId}/city`] = editField2;
    }
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(database), updates);
  }
}


  } else {
    // ✅ recombine name + qty into single string for Firebase
    const newName = `${editField1} (${editField2})`;

    // 1️⃣ Get old name first
    const productSnap = await get(ref(database, `${path}/${id}`));
    if (!productSnap.exists()) return;
    const oldName = productSnap.val().name;

    // 2️⃣ Update product in `products`
    await update(ref(database, `${path}/${id}`), { name: newName });

    // 3️⃣ Update productName in sellOrders
    const sellOrdersSnap = await get(ref(database, 'sellOrders'));
    if (sellOrdersSnap.exists()) {
      const updates = {};
      const sellOrders = sellOrdersSnap.val();

      Object.keys(sellOrders).forEach((orderId) => {
        const items = sellOrders[orderId].items || {};
        Object.keys(items).forEach((itemKey) => {
          if (items[itemKey].productName === oldName) {
            updates[`sellOrders/${orderId}/items/${itemKey}/productName`] = newName;
          }
        });
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }
    }

    // 4️⃣ Update productName in pendingOrders
    const pendingOrdersSnap = await get(ref(database, 'pendingOrders'));
    if (pendingOrdersSnap.exists()) {
      const updates = {};
      const pendingOrders = pendingOrdersSnap.val();

      Object.keys(pendingOrders).forEach((orderId) => {
        const order = pendingOrders[orderId];
        if (order.productName === oldName) {
          updates[`pendingOrders/${orderId}/productName`] = newName;
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }
    }
  }

  setEditId(null);
};


  const handleCancel = () => {
    setEditId(null);
  };

  // Filter list
  const filteredList =
    selectedOption === 'customer'
      ? customers.filter((cust) =>
          `${cust.name} ${cust.city}`.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : products.filter((prod) =>
          `${prod.name} ${prod.qty}`.toLowerCase().includes(searchTerm.toLowerCase()) // 🔹 Changed from price to qty
        );

  return (
    <div className="view-items-container" style={{ padding: '20px' }}>
      <h2>View Items</h2>

      {/* Dropdown selection */}
      <select
        value={selectedOption}
        onChange={(e) => setSelectedOption(e.target.value)}
        className="view-items-select"
      >
        <option value="">-- Select an option --</option>
        <option value="customer">Customer Name</option>
        <option value="product">Product Items</option>
      </select>

      {/* Display Section */}
      {selectedOption && (
        <div className="data-section" style={{ marginTop: '20px' }}>
          {loading ? (
  <p>Loading...</p>
) : (
  <>
    {/* ✅ Always show search bar */}
    <input
      type="text"
      placeholder={`Search ${selectedOption}...`}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      style={{ padding: '5px', marginBottom: '10px', width: '100%' }}
    />

    {filteredList.length > 0 ? (
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ background: '#f4f4f4' }}>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Name</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>
              {selectedOption === 'customer' ? 'City' : 'Qty'}
            </th>
            {selectedOption === 'customer' && (
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Number</th>
            )}
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
  {filteredList.map((item) => (
    <tr key={item.id}>
      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
        {editId === item.id ? (
          <input
  type="text"
  value={editField1}
  onChange={(e) => setEditField1(e.target.value)}
  onKeyDown={handleKeyDown}
  style={{ width: '100%' }}
  autoFocus   // ✅ ensures Name field is focused when Edit clicked
/>

        ) : (
          item.name
        )}
      </td>
      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
        {editId === item.id ? (
          <input
  type="text"
  value={editField2}
  onChange={(e) => setEditField2(e.target.value)}
  onKeyDown={(e) => {
    // Allow Shift+Tab to go backwards normally
    if (e.key === "Tab" && e.shiftKey) return;

    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();

      if (selectedOption === "customer") {
        // 👉 Go to Number column
        const numberInput = e.target
          .closest("tr")
          .querySelector("td:nth-child(3) input"); 
        if (numberInput) numberInput.focus();
      } else {
        // 👉 Product: go directly to Save button
        const saveBtn = e.target
          .closest("tr")
          .querySelector("button:first-of-type");
        if (saveBtn) saveBtn.focus();
      }
    }
  }}
  style={{ width: "100%" }}
/>

        ) : selectedOption === 'customer' ? (
          item.city
        ) : (
          item.qty
        )}
      </td>
      {selectedOption === 'customer' && (
        <td style={{ border: '1px solid #ccc', padding: '8px' }}>
          {editId === item.id ? (
            <input
  type="text"
  value={editField3}
  onChange={(e) => {
    let val = e.target.value.replace(/\D/g, '');
    val = val.slice(0, 10);
    setEditField3(val);
  }}
  onKeyDown={(e) => {
    // If user pressed Shift+Tab, allow default (go backward)
    if (e.key === "Tab" && e.shiftKey) {
      return; // do not preventDefault -> browser will move focus backwards
    }

    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const saveBtn = e.target
        .closest("tr")
        .querySelector("button:first-of-type"); // Save button in Action column
      if (saveBtn) saveBtn.focus();
    }
  }}
  style={{ width: '100%' }}
/>

          ) : (
            item.number
          )}
        </td>
      )}
      <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
        {editId === item.id ? (
          <>
            <button
              onClick={() => handleSave(item.id)}
              style={{ marginRight: '8px', background: 'green', color: 'white' }}
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              style={{ background: 'gray', color: 'white' }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button onClick={() => handleEdit(item)} style={{ marginRight: '8px' }}>
              Edit
            </button>
            <button
              onClick={() => handleDelete(item.id)}
              style={{
                color: 'white',
                background: 'red',
                border: 'none',
                padding: '5px 8px',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          </>
        )}
      </td>
    </tr>
  ))}
</tbody>

      </table>
    ) : (
      <p>No {selectedOption === 'customer' ? 'customers' : 'products'} found.</p>
    )}
  </>
)}
        </div>
      )}
    </div>
  );
};

export default ViewItems;
