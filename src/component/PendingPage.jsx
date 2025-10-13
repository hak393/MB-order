// src/component/PendingPage.jsx
import React, { useEffect, useState } from 'react';
import { database } from '../firebase/firebase'; 
import { ref, onValue, remove, set } from 'firebase/database';
import './Style.css';

const PendingPage = () => {
  const [groupedOrders, setGroupedOrders] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredKeys, setFilteredKeys] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedEditId, setSelectedEditId] = useState(null);
const [editValues, setEditValues] = useState({
  qty: '',
  weight: '',
  less: '',
  price: '',
  packet: ''
});


  useEffect(() => {
    const pendingRef = ref(database, 'pendingOrders');
    const unsubscribe = onValue(pendingRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, order]) => ({ id, ...order })) : [];

      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const grouped = {};
      list.forEach(order => {
        const key = `${order.customerName} (${order.city || 'Unknown'})`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(order);
      });

      setGroupedOrders(grouped);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredKeys([]);
      setSelectedKey(null);
      return;
    }

    if (Object.keys(groupedOrders).includes(searchTerm)) {
      setFilteredKeys([]);
      setSelectedKey(searchTerm);
      return;
    }

    const lowerSearch = searchTerm.toLowerCase();
    const matches = Object.keys(groupedOrders).filter(key =>
      key.toLowerCase().startsWith(lowerSearch)
    );
    setFilteredKeys(matches);
    setSelectedKey(null);
  }, [searchTerm, groupedOrders]);

  const handleSelect = (key) => {
    setSelectedKey(key);
    setSearchTerm(key);
    setFilteredKeys([]);
  };

  const getCustomerCity = (key) => {
    if (!key) return { customerName: '', city: '' };
    const match = key.match(/^(.+?) \((.+)\)$/);
    if (!match) return { customerName: key, city: '' };
    return { customerName: match[1], city: match[2] };
  };

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2,'0');
  const month = (date.getMonth() + 1).toString().padStart(2,'0');
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2,'0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
};


  const handleSaveEdit = (orderId, key) => {
  const up = [...groupedOrders[key]];
  const index = up.findIndex(o => o.id === orderId);
  if (index > -1) {
    up[index] = {
      ...up[index],
      remainingQty: editValues.qty,
      weight: editValues.weight,
      less: editValues.less,
      price: editValues.price,
      packet: editValues.packet
    };

    // Update Firebase
    const orderRef = ref(database, `pendingOrders/${orderId}`);
    set(orderRef, up[index]);

    const updatedGroupedOrders = { ...groupedOrders };
    updatedGroupedOrders[key] = up;
    setGroupedOrders(updatedGroupedOrders);
  }

  setSelectedEditId(null);
};


  const formatLess = (less) => {
    if (!less) return '-';
    const isNumeric = !isNaN(less);
    return isNumeric ? `${less}%` : less;
  };

  const handleDelete = (orderId, key) => {
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
          Are you sure you want to delete this pending order?
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
    const orderRef = ref(database, `pendingOrders/${orderId}`);
    remove(orderRef);

    const updatedGroupedOrders = { ...groupedOrders };
    updatedGroupedOrders[key] = updatedGroupedOrders[key].filter(order => order.id !== orderId);

    if (updatedGroupedOrders[key].length === 0) {
      delete updatedGroupedOrders[key];
      if (selectedKey === key) setSelectedKey(null);
    }

    setGroupedOrders(updatedGroupedOrders);

    document.body.removeChild(confirmBox);
  };

  // ✅ Handle NO click
  document.getElementById("confirmNo").onclick = () => {
    document.body.removeChild(confirmBox);
  };
};


  const keysToDisplay = selectedKey ? [selectedKey] : Object.keys(groupedOrders);

  return (
    <div className="orderpage-container">
      <h2 className="page-title">PENDING ORDERS</h2>

      <div className="search-wrapper">
        <input
          type="text"
          placeholder="Search customer name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
          onFocus={(e) => e.target.classList.add('focus')}
          onBlur={(e) => e.target.classList.remove('focus')}
        />
        {filteredKeys.length > 0 && (
          <ul className="search-dropdown">
            {filteredKeys.map((key) => (
              <li
                key={key}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(key)}
                className="dropdown-item"
              >
                {key}
              </li>
            ))}
          </ul>
        )}
      </div>

      {keysToDisplay.length > 0 ? (
        keysToDisplay.map((key) => {
          const orders = groupedOrders[key] || [];
          const { customerName, city } = getCustomerCity(key);

          return (
            <div className="pending-group" key={key}>
              <div className="customer-info">
                <div><strong>CUSTOMER NAME:</strong> {customerName}</div>
                <div><strong>CITY:</strong> {city}</div>
              </div>
              <table className="orders-table compact-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Weight</th>
                    <th>Less</th>
                    <th>Price</th>
                    <th>Packet</th>
                    <th>Time</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
  {orders.map((order, index) => {
    const isEditing = order.id === selectedEditId; // track which row is in edit mode
    return (
      <tr key={order.id || index}>
        <td>{order.productName}</td>
        
        {/* Qty */}
        <td>
          {isEditing ? (
            <input
              type="number"
              value={editValues.qty}
              onChange={(e) =>
                setEditValues({ ...editValues, qty: e.target.value })
              }
              style={{ width: '60px' }}
            />
          ) : (
            `${order.remainingQty} ${order.unit}`
          )}
        </td>

        {/* Weight */}
        <td>
          {isEditing ? (
            <input
              type="text"
              value={editValues.weight}
              onChange={(e) =>
                setEditValues({ ...editValues, weight: e.target.value })
              }
              style={{ width: '60px' }}
            />
          ) : (
            order.weight || '-'
          )}
        </td>

        {/* Less */}
        {/* Less */}
<td>
  {isEditing ? (
    (editValues.less?.includes("%") || !editValues.less) ? (
      <div style={{ display: "flex", alignItems: "center" }}>
        <input
          type="number"
          value={editValues.less && editValues.less.includes("%") ? editValues.less.replace("%", "") : "0"}
          onChange={e => {
            let val = e.target.value;
            setEditValues({ ...editValues, less: val ? val + "%" : "0%" });
          }}
          style={{
            width: "60px",
            fontSize: "14px",
            padding: "4px",
            border: "1px solid #ccc",
            borderRadius: "4px 0 0 4px",
            outline: "none"
          }}
        />
        <select
          value={["%", "NET", "Pair", "Full Bill", "Half Bill"].includes(editValues.less) ? editValues.less : "%"}
          onChange={e => {
            const val = e.target.value;
            setEditValues({ ...editValues, less: val === "%" ? "0%" : val });
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
        value={editValues.less}
        onChange={e => setEditValues({ ...editValues, less: e.target.value })}
        style={{
          width: "120px",
          fontSize: "14px",
          padding: "4px",
          borderRadius: "4px",
          border: "1px solid #ccc",
          backgroundColor: "#fff",
          cursor: "pointer"
        }}
      >
        <option value="%">%</option>
        <option value="NET">NET</option>
        <option value="Pair">Pair</option>
        <option value="Full Bill">Full Bill</option>
        <option value="Half Bill">Half Bill</option>
        {!["%", "NET", "Pair", "Full Bill", "Half Bill"].includes(editValues.less) && (
          <option value={editValues.less}>{editValues.less}</option>
        )}
      </select>
    )
  ) : (
    order.less || "-"
  )}
</td>


        {/* Price */}
        <td>
          {isEditing ? (
            <input
              type="number"
              value={editValues.price}
              onChange={(e) =>
                setEditValues({ ...editValues, price: e.target.value })
              }
              style={{ width: '60px' }}
            />
          ) : (
            `₹${order.price}`
          )}
        </td>

        {/* Packet */}
        <td>
          {isEditing ? (
            <input
              type="text"
              value={editValues.packet}
              onChange={(e) =>
                setEditValues({ ...editValues, packet: e.target.value })
              }
              style={{ width: '60px' }}
            />
          ) : (
            order.packet || '-'
          )}
        </td>

        <td>{formatTimestamp(order.timestamp)}</td>

        <td>
          {isEditing ? (
            <>
              <button
                className="save-button"
                onClick={() => handleSaveEdit(order.id, key)}
              >
                Save
              </button>
              <button
                className="cancel-button"
                onClick={() => setSelectedEditId(null)}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                className="edit-button"
                onClick={() => {
                  setSelectedEditId(order.id);
                  setEditValues({
                    qty: order.remainingQty,
                    weight: order.weight || '',
                    less: order.less || '',
                    price: order.price,
                    packet: order.packet || ''
                  });
                }}
              >
                Edit
              </button>
              <button
                className="delete-button"
                onClick={() => handleDelete(order.id, key)}
              >
                Delete
              </button>
            </>
          )}
        </td>
      </tr>
    );
  })}
</tbody>

              </table>
            </div>
          );
        })
      ) : (
        <p className="hint-text">
          Start typing customer name above to see pending orders.
        </p>
      )}
    </div>
  );
};

export default PendingPage;
