// src/component/PendingPage.jsx
import React, { useEffect, useState } from 'react';
import { database } from '../firebase/firebase'; 
import { ref, onValue, remove } from 'firebase/database';
import './Style.css';

const PendingPage = () => {
  const [groupedOrders, setGroupedOrders] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredKeys, setFilteredKeys] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);

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
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
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
                  {orders.map((order, index) => (
                    <tr key={order.id || index}>
                      <td>{order.productName}</td>
                      <td>{`${order.remainingQty} ${order.unit}`}</td>
                      <td>{order.weight || '-'}</td>
                      <td>{formatLess(order.less)}</td>
                      <td>₹{order.price}</td>
                      <td>{order.packet || '-'}</td>
                      <td>{formatTimestamp(order.timestamp)}</td>
                      <td>
                        <button
                          className="delete-button"
                          onClick={() => handleDelete(order.id, key)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
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
