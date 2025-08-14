// src/component/AddProduct.jsx
import React, { useState, useEffect } from 'react';
import { database } from '../firebase/firebase';
import { ref, push, onValue } from 'firebase/database';
import './Style.css';

const AddProduct = () => {
  // Customer states
  const [customerName, setCustomerName] = useState('');
  const [city, setCity] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');

  // Product states
  const [productName, setProductName] = useState('');
  const [productQty, setProductQty] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [productsList, setProductsList] = useState([]); // existing products with qty

  // Popup state
  const [popup, setPopup] = useState({ show: false, message: '' });

  // Auto-hide popup
  useEffect(() => {
    if (popup.show) {
      const timer = setTimeout(() => setPopup({ show: false, message: '' }), 2000);
      return () => clearTimeout(timer);
    }
  }, [popup]);

  // Fetch existing products
  useEffect(() => {
    const productsRef = ref(database, 'products');
    return onValue(productsRef, snapshot => {
      const data = snapshot.val();
      const products = data
        ? Object.values(data).map(p => ({ name: p.name, qty: p.qty }))
        : [];
      setProductsList(products);
    });
  }, []);

  // Normalize string: remove spaces & lowercase
  const normalize = str => str.replace(/\s+/g, '').toLowerCase();

  // Add customer
  const handleAddCustomer = () => {
    if (!customerName.trim() || !city.trim() || !customerNumber.trim()) {
      setPopup({ show: true, message: 'Please enter customer name, city, and number!' });
      return;
    }

    push(ref(database, 'customers'), {
      name: customerName.trim(),
      city: city.trim(),
      number: customerNumber.trim(),
    });

    setPopup({ show: true, message: `Customer "${customerName}" (${city}, ${customerNumber}) added! ✅` });
    setCustomerName(''); setCity(''); setCustomerNumber('');
  };

  // Add product
  const handleAddProduct = () => {
    if (!productName.trim() || !productQty.trim()) {
      setPopup({ show: true, message: 'Please enter product name and quantity!' });
      return;
    }
    if (isNaN(productQty) || Number(productQty) <= 0) {
      setPopup({ show: true, message: 'Please enter a valid quantity!' });
      return;
    }

    const qtyWithUnit = `${productQty} ${unit}`;

    push(ref(database, 'products'), {
      name: productName.trim(),
      qty: qtyWithUnit,
      unit: unit,
    });

    setPopup({ show: true, message: `Product "${productName}" with quantity ${qtyWithUnit} added! ✅` });
    setProductName(''); setProductQty(''); setUnit('pcs');
  };

  // Filter products for display ignoring spaces
  const filteredProducts = productsList.filter(p =>
    normalize(p.name).includes(normalize(productName)) && productName.trim() !== ''
  );

  // Check if product with same name and qty exists ignoring spaces
  const qtyWithUnit = `${productQty} ${unit}`;
  const isDuplicate = productsList.some(
    p => normalize(p.name) === normalize(productName.trim()) && p.qty === qtyWithUnit
  );

  return (
    <div className="add-product">
      {popup.show && (
        <div className="success-popup top-center">
          <span className="checkmark">✔</span> {popup.message}
        </div>
      )}

      <h1>Add Data</h1>

      {/* Customer Section */}
      <div className="section-block">
        <h3>Add Customer with City and Number</h3>
        <input
          type="text"
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          placeholder="Enter customer name"
        /><br />
        <input
          type="text"
          value={city}
          onChange={e => setCity(e.target.value)}
          placeholder="Enter city"
          style={{ marginTop: '10px' }}
        /><br />
        <input
          type="tel"
          value={customerNumber}
          onChange={(e) => {
            let value = e.target.value;
            if (!value.startsWith('+91')) value = '+91' + value.replace(/\D/g, '');
            else value = '+91' + value.slice(3).replace(/\D/g, '');
            if (value.length > 13) value = value.slice(0, 13);
            setCustomerNumber(value);
          }}
          onKeyDown={(e) => {
            const cursorPos = e.target.selectionStart;
            if ((cursorPos <= 3) && (e.key === 'Backspace' || e.key === 'Delete')) e.preventDefault();
          }}
          placeholder="+91XXXXXXXXXX"
          style={{ marginTop: '10px' }}
        /><br />
        <button className="btn-manual" onClick={handleAddCustomer} style={{ marginTop: '10px' }}>Save Customer</button>
      </div>

      <hr style={{ margin: '30px 0' }} />

      {/* Product Section */}
      <div className="section-block">
  <h3>Add Product</h3>

  {/* Product Name Input */}
  <input
    type="text"
    value={productName}
    onChange={(e) => setProductName(e.target.value)}
    placeholder="Enter product name"
  />

  {/* Display matching products with quantity */}
  {filteredProducts.length > 0 && (
    <div className="product-dropdown-display">
      {filteredProducts.map((p, i) => (
        <div key={i} className="product-item-display">
          {p.name} - {p.qty}
        </div>
      ))}
    </div>
  )}

  {/* Product Quantity Input */}
  <input
    type="number"
    value={productQty}
    onChange={(e) => setProductQty(e.target.value.replace(/-/g, ''))}
    onKeyDown={(e) => {
      if (e.key === '-') e.preventDefault();
    }}
    placeholder="Enter product quantity"
    style={{ marginTop: '10px' }}
  />

  {/* Unit Dropdown */}
  <select
    value={unit}
    onChange={(e) => setUnit(e.target.value)}
    style={{
      marginTop: '10px',
      marginLeft: '10px',
      padding: '5px 10px',
      fontSize: '15px',
      borderRadius: '6px',
      minWidth: '10px'
    }}
  >
    <option value="pcs">pcs</option>
    <option value="pk">pk</option>
    <option value="case">case</option>
    <option value="pair">pair</option>
    <option value="set">set</option>
    <option value="grs">grs</option>
  </select>

  <br />

  {/* Save Product Button */}
  <button
    className="btn-manual"
    onClick={handleAddProduct}
    style={{
      marginTop: '10px',
      backgroundColor: isDuplicate ? '#d3d3d3' : '',
      cursor: isDuplicate ? 'not-allowed' : 'pointer'
    }}
    disabled={isDuplicate} // disable if duplicate
  >
    Save Product
  </button>

  {isDuplicate && (
    <div style={{ color: 'red', marginTop: '5px' }}>
      This product with the same quantity already exists!
    </div>
  )}
</div>

    </div>
  );
};

export default AddProduct;
