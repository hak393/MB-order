import React, { useState, useEffect } from 'react';
import { database } from '../firebase/firebase';
import { ref, push } from 'firebase/database';
import './Style.css';

const AddProduct = () => {
  // States for customer
  const [customerName, setCustomerName] = useState('');
  const [city, setCity] = useState('');

  // States for product
  const [productName, setProductName] = useState('');
  const [productQty, setProductQty] = useState('');
  const [unit, setUnit] = useState('pcs'); // default pcs

  // Success message state
  const [popup, setPopup] = useState({ show: false, message: '' });

  // Auto-hide popup after 2 seconds
  useEffect(() => {
    if (popup.show) {
      const timer = setTimeout(() => {
        setPopup({ show: false, message: '' });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [popup]);

  /** ADD CUSTOMER **/
  const handleAddCustomer = () => {
    if (!customerName.trim() || !city.trim()) {
      setPopup({ show: true, message: 'Please enter customer name and city!' });
      return;
    }

    push(ref(database, 'customers'), {
      name: customerName.trim(),
      city: city.trim(),
    });

    setPopup({
      show: true,
      message: `Customer "${customerName}" (${city}) added! ✅`
    });

    setCustomerName('');
    setCity('');
  };

  /** ADD PRODUCT **/
  const handleAddProduct = () => {
    if (!productName.trim() || !productQty.trim()) {
      setPopup({ show: true, message: 'Please enter product name and quantity!' });
      return;
    }

    if (isNaN(productQty) || Number(productQty) <= 0) {
      setPopup({ show: true, message: 'Please enter a valid quantity!' });
      return;
    }

    // Combine quantity with unit (e.g., "600 pcs")
    const qtyWithUnit = `${productQty} ${unit}`;

    push(ref(database, 'products'), {
      name: productName.trim(),
      qty: qtyWithUnit,
      unit: unit,
    });

    setPopup({
      show: true,
      message: `Product "${productName}" with quantity ${qtyWithUnit} added! ✅`
    });

    setProductName('');
    setProductQty('');
    setUnit('pcs');
  };

  return (
    <div className="add-product">
      {/* Popup Notification */}
      {popup.show && (
        <div className="success-popup top-center">
          <span className="checkmark">✔</span> {popup.message}
        </div>
      )}

      <h1>Add Data</h1>

      {/* Add Customer Section */}
      <div className="section-block">
        <h3>Add Customer with City</h3>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Enter customer name"
        />
        <br />
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city"
          style={{ marginTop: '10px' }}
        />
        <br />
        <button
          className="btn-manual"
          onClick={handleAddCustomer}
          style={{ marginTop: '10px' }}
        >
          Save Customer
        </button>
      </div>

      <hr style={{ margin: '30px 0' }} />

      {/* Add Product Section */}
      <div className="section-block">
        <h3>Add Product</h3>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="Enter product name"
        />
        <br />
        <input
  type="number"
  value={productQty}
  onChange={(e) => {
    const value = e.target.value.replace(/-/g, '');
    setProductQty(value);
  }}
  onKeyDown={(e) => {
    if (e.key === '-') e.preventDefault();
  }}
  placeholder="Enter product quantity"
  style={{ marginTop: '10px' }}
/>

        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          style={{
            marginTop: '10px',
            marginLeft: '10px',
            padding: '5px 10px',
            fontSize: '15px',
            borderRadius: '6px',
            minWidth: '10px',
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
        <button
          className="btn-manual"
          onClick={handleAddProduct}
          style={{ marginTop: '10px' }}
        >
          Save Product
        </button>
      </div>
    </div>
  );
};

export default AddProduct;
