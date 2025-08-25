// src/component/ViewItems.jsx
import React, { useEffect, useState } from 'react';
import { database } from '../firebase/firebase';
import { ref, onValue, remove, update } from 'firebase/database';
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

  // Fetch data from Firebase when option changes
  useEffect(() => {
  if (selectedOption) {
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
          };
        } else {
          let fullName = data[id].name || 'Unknown';
          let name = fullName;
          let qty = '';

          // ✅ extract qty inside brackets e.g. "railway hinges (6 pcs)"
          const match = fullName.match(/^(.*?)\s*\((.*?)\)$/);
          if (match) {
            name = match[1].trim();   // railway hinges
            qty = match[2].trim();    // 6 pcs
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
    setSearchTerm('');
  }
}, [selectedOption]);

  // Delete item from Firebase
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      const path = selectedOption === 'customer' ? 'customers' : 'products';
      remove(ref(database, `${path}/${id}`));
    }
  };

  // Start editing
  const handleEdit = (item) => {
    setEditId(item.id);
    setEditField1(item.name);
    setEditField2(selectedOption === 'customer' ? item.city : item.qty); // 🔹 Changed from price to qty
  };

  // Save updated data
  const handleSave = (id) => {
  if (!editField1.trim() || !editField2.trim()) {
    alert('Fields cannot be empty');
    return;
  }
  const path = selectedOption === 'customer' ? 'customers' : 'products';
  let updateData;

  if (selectedOption === 'customer') {
    updateData = { name: editField1, city: editField2 };
  } else {
    // ✅ recombine name + qty into single string for Firebase
    updateData = { name: `${editField1} (${editField2})` };
  }

  update(ref(database, `${path}/${id}`), updateData);
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
          ) : filteredList.length > 0 ? (
            <>
              {/* Search bar */}
              <input
                type="text"
                placeholder={`Search ${selectedOption}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '5px', marginBottom: '10px', width: '100%' }}
              />

              {/* Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                <thead>
                  <tr style={{ background: '#f4f4f4' }}>
                    <th style={{ border: '1px solid #ccc', padding: '8px' }}>Name</th>
                    <th style={{ border: '1px solid #ccc', padding: '8px' }}>
                      {selectedOption === 'customer' ? 'City' : 'Qty'} {/* 🔹 Changed from Price to Qty */}
                    </th>
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
                            style={{ width: '100%' }}
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
                            style={{ width: '100%' }}
                          />
                        ) : selectedOption === 'customer' ? (
                          item.city
                        ) : (
                          item.qty // 🔹 Changed from price to qty
                        )}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                        {editId === item.id ? (
                          <>
                            <button
                              onClick={() => handleSave(item.id)}
                              style={{ marginRight: '8px', background: 'green', color: 'white' }}
                            >
                              Save
                            </button>
                            <button onClick={handleCancel} style={{ background: 'gray', color: 'white' }}>
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
            </>
          ) : (
            <p>No {selectedOption === 'customer' ? 'customers' : 'products'} found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ViewItems;
