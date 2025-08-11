import React, { useEffect, useState } from 'react';
import './Style.css';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';

const firebaseConfig = {
  databaseURL: 'https://project-file-53396-default-rtdb.firebaseio.com',
};

// Initialize Firebase app only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

const Extra = () => {
  const [customerName, setCustomerName] = useState('');
  const [city, setCity] = useState('');
  const [allCustomerData, setAllCustomerData] = useState({});
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const ordersRef = ref(db, 'orders');
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      const customerMap = {};

      if (data) {
        Object.values(data).forEach((userOrders) => {
          if (userOrders && typeof userOrders === 'object') {
            Object.entries(userOrders).forEach(([customer, details]) => {
              if (!customerMap[customer]) {
                customerMap[customer] = details.city || '';
              }
            });
          }
        });
      }

      setAllCustomerData(customerMap);
    });

    return () => unsubscribe();
  }, []);

  const handleCustomerNameChange = (e) => {
    const input = e.target.value;
    setCustomerName(input);

    if (input.length > 0) {
      const filtered = Object.entries(allCustomerData).filter(([name]) =>
        name.toLowerCase().startsWith(input.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (name, cityValue) => {
    setCustomerName(name);
    setCity(cityValue || '');
    setSuggestions([]);
  };

  return (
    <div className="extra-page">
      <h1>Extra Page</h1>

      <div className="form-group">
        <label>Customer Name:</label>
        <input
          type="text"
          value={customerName}
          onChange={handleCustomerNameChange}
          className="input-field"
          placeholder="Enter customer name"
        />
        {suggestions.length > 0 && (
          <ul className="suggestion-list">
            {suggestions.map(([name, cityValue], idx) => (
              <li key={idx} onClick={() => handleSelectSuggestion(name, cityValue)}>
                {name} - {cityValue}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="form-group">
        <label>City:</label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="input-field"
          placeholder="Enter city"
        />
      </div>
    </div>
  );
};

export default Extra;
