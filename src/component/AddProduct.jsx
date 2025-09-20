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
        ? Object.values(data).map(p => ({ name: p.name }))
        : [];
      setProductsList(products);
    });
  }, []);

  // Normalize string: remove spaces & lowercase
  const normalize = str => str.replace(/\s+/g, '').toLowerCase();

  // Capitalize first letter after space
  const toTitleCase = (str) =>
    str.replace(/\b\w/g, (char) => char.toUpperCase());

  // Move focus to next field when pressing Enter
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const form = e.target.form;
      const index = Array.prototype.indexOf.call(form, e.target);
      form.elements[index + 1]?.focus();
    }
  };

  // Add customer
  // Add customer
  const handleAddCustomer = () => {
    if (!customerName.trim() || !city.trim() || !customerNumber.trim()) {
      setPopup({ show: true, message: 'Please enter customer name, city, and number!' });
      return;
    }

    // ✅ Apply TitleCase for Customer Name and City
    const formattedCustomer = toTitleCase(customerName.trim());
    const formattedCity = toTitleCase(city.trim());

    push(ref(database, 'customers'), {
      name: formattedCustomer,
      city: formattedCity,
      number: customerNumber.trim(),
    });

    setPopup({ show: true, message: `Customer "${formattedCustomer}" (${formattedCity}, ${customerNumber}) added! ✅` });
    setCustomerName('');
    setCity('');
    setCustomerNumber('');
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

    // ✅ Capitalize first letter of each word in product name
    const formattedName = toTitleCase(productName.trim());

    // Combine everything into one line: "ProductName (Qty Unit)"
    const finalName = `${formattedName} (${productQty} ${unit})`;

    push(ref(database, 'products'), {
      name: finalName
    });

    setPopup({ show: true, message: `Product "${finalName}" added! ✅` });
    setProductName('');
    setProductQty('');
    setUnit('pcs');
  };

  // Filter products for display ignoring spaces
  const filteredProducts = productsList.filter(p =>
    normalize(p.name).includes(normalize(productName)) && productName.trim() !== ''
  );

  // Check if product with same name and qty exists ignoring spaces
  const finalName = `${productName.trim()} (${productQty} ${unit})`;
  const isDuplicate = productsList.some(
    p => normalize(p.name) === normalize(finalName)
  );

  return (
    <div className="add-product">
      {popup.show && (
        <div className="success-popup top-center">
          <span className="checkmark">✔</span> {popup.message}
        </div>
      )}

      <h1>Add Data</h1>

      {/* Wrap in form to support Enter-as-Tab navigation */}
      <form>
        {/* Product Section */}
        <div className="section-block">
          <h3>Add Product</h3>

          {/* Product Name Input */}
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            onKeyDown={handleKeyDown}
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
              else handleKeyDown(e);
            }}
            placeholder="Enter product quantity"
            style={{ marginTop: '10px' }}
          />

          {/* Unit Dropdown */}
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            style={{
              marginTop: "10px",
              marginLeft: "10px",
              padding: "5px 10px",
              fontSize: "15px",
              borderRadius: "6px",
              minWidth: "10px",
            }}
          >
            <option value="pcs">pcs</option>
            <option value="pk">pk</option>
            <option value="pair">pair</option>
            <option value="set">set</option>
            <option value="grs">grs</option>
          </select>

          <br />


          {/* Save Product Button */}
          <button
            type="button"
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
        <hr style={{ margin: '30px 0' }} />

        {/* Customer Section */}
        <div className="section-block">
          <h3>Add Customer with City and Number</h3>
          <input
            type="text"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter customer name"
          /><br />
          <input
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter city"
            style={{ marginTop: '10px' }}
          /><br />
          <input
            type="tel"
            value={customerNumber}
            onChange={(e) => {
              let value = e.target.value.replace(/\D/g, '');
              if (value.length > 10) value = value.slice(0, 10);
              setCustomerNumber(value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Customer Number"
            style={{ marginTop: '10px' }}
          /><br />

          <button
            type="button"
            className="btn-manual"
            onClick={handleAddCustomer}
            style={{ marginTop: '10px' }}
          >
            Save Customer
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
