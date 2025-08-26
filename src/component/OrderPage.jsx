import React, { useState, useEffect, useRef } from 'react';
import './Style.css';

const URL = 'https://mb-order-3764e-default-rtdb.firebaseio.com/';

const OrderPage = () => {
  const [transportName, setTransportName] = useState('');
  const [userName, setUserName] = useState(''),
    [custName, setCustName] = useState(''),
    [city, setCity] = useState('');
  const [suggestions, setSuggestions] = useState([]),
    [prodSuggestions, setProdSuggestions] = useState([]),
    [customers, setCustomers] = useState({});
  const [editing, setEditing] = useState(null),
    [productName, setProductName] = useState(''),
    [unit, setUnit] = useState('pk');
  const [lessVal, setLessVal] = useState(''),
    [lessUnit, setLessUnit] = useState('%'),
    [qty, setQty] = useState('');
  const [weight, setWeight] = useState(''),
    [price, setPrice] = useState(''),
    [selectedProdQty, setSelectedProdQty] = useState(1);
  const [selectedProdUnit, setSelectedProdUnit] = useState('pcs'),
    [validCustomer, setValidCustomer] = useState(false),
    [validProduct, setValidProduct] = useState(false);
  const [customerError, setCustomerError] = useState(false),
    [productError, setProductError] = useState(false),
    [pendingOrders, setPendingOrders] = useState([]);
  const [justSelectedCustomer, setJustSelectedCustomer] = useState(false),
    [highlightedCustIndex, setHighlightedCustIndex] = useState(-1),
    [highlightedProdIndex, setHighlightedProdIndex] = useState(-1);
  const [justSelectedProduct, setJustSelectedProduct] = useState(false);



  const refDebCust = useRef(null),
    refDebProd = useRef(null),
    productInputRef = useRef(null),
    customerInputRef = useRef(null),
    customerListRef = useRef(null),
    productListRef = useRef(null);
  const qtyInputRef = useRef(null);

  useEffect(() => {
    if (customerListRef.current && highlightedCustIndex >= 0)
      customerListRef.current.querySelectorAll('li')[highlightedCustIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightedCustIndex]);

  useEffect(() => {
    if (productListRef.current && highlightedProdIndex >= 0)
      productListRef.current.querySelectorAll('li')[highlightedProdIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightedProdIndex]);

  useEffect(() => {
    const s = localStorage.getItem('userName');
    if (s) setUserName(s);
  }, []);

  useEffect(() => {
    if (refDebCust.current) clearTimeout(refDebCust.current);
    if (justSelectedCustomer || !custName.trim()) return setSuggestions([]);
    setValidCustomer(false);
    refDebCust.current = setTimeout(() => {
      fetch(`${URL}/customers.json`).then(r => r.json()).then(d => {
        if (!d) return setSuggestions([]);
        const search = custName.toLowerCase();
        setSuggestions(Object.values(d).filter(c => c.name?.toLowerCase().includes(search)).map(c => ({ name: c.name, city: c.city })).slice(0, 10));
        setHighlightedCustIndex(-1);
      }).catch(() => setSuggestions([]));
    }, 200);
  }, [custName, justSelectedCustomer]);

  useEffect(() => {
    if (refDebProd.current) clearTimeout(refDebProd.current);
    if (justSelectedProduct) {
    setProdSuggestions([]); // ✅ don’t refetch after selecting
    return;
  }
    if (!productName.trim()) {
    setProdSuggestions([]);
    return;
  }
    setValidProduct(false);
    refDebProd.current = setTimeout(async () => {
      try {
        const r = await fetch(`${URL}/products.json`), d = await r.json();
        if (!d) return setProdSuggestions([]);
        let searchTerm = productName.toLowerCase().replace(/\s+/g, ''); // remove spaces
        let suggestions = Object.values(d)
  .filter(p => p.name?.toLowerCase().replace(/\s+/g, '').includes(searchTerm))
  .map(p => {
    // try to match pattern like "something (10 pcs)"
    const match = p.name.match(/\((\d+)\s*([a-zA-Z]+)\)/);
    return {
      name: p.name,
      qty: match ? parseInt(match[1]) : 1,
      unit: match ? match[2] : 'pcs',
      price: null,
      less: null
    };
  });


        if (custName?.trim()) {
          const sellRes = await fetch(`${URL}/sellOrders.json`), sellData = await sellRes.json();
          if (sellData) {
            const custOrders = Object.values(sellData).filter(o => o.customerName?.toLowerCase().trim() === custName.toLowerCase().trim());
            custOrders.forEach(order => {
              if (Array.isArray(order.items)) {
                order.items.forEach(item => {
                  const match = suggestions.find(s =>
                    s.name.toLowerCase().replace(/\s+/g, '') === item.productName?.toLowerCase().replace(/\s+/g, '') ||
                    s.name.toLowerCase().replace(/\s+/g, '').includes(item.productName?.toLowerCase().replace(/\s+/g, '')) ||
                    item.productName?.toLowerCase().replace(/\s+/g, '').includes(s.name.toLowerCase().replace(/\s+/g, ''))
                  );

                  if (match) { match.price = item.price || null; match.less = item.less || null; }
                });
              }
            });
          }
        }
        setProdSuggestions(suggestions.slice(0, 10));
        setHighlightedProdIndex(-1);
      } catch (e) { console.error(e); setProdSuggestions([]); }
    }, 200);
  }, [productName, custName , justSelectedProduct]);

  useEffect(() => {
  if (!productName.trim()) {
    setJustSelectedProduct(false);  // reset only when product field is empty
  }
}, [productName]);



  const selectCustomer = (n, c) => {
    setCustName(n);
    setCity(c || '');
    setSuggestions([]);
    setValidCustomer(true);
    setCustomerError(false);
    setJustSelectedCustomer(true);
    fetchPendingOrders(n, c);
    productInputRef.current?.focus();
  };
  const handleCustomerChange = e => { setCustName(e.target.value); setJustSelectedCustomer(false); };
  const handleCustomerKeyDown = e => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedCustIndex(p => (p + 1) % suggestions.length);
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedCustIndex(p => (p <= 0 ? suggestions.length - 1 : p - 1));
    }
    else if ((e.key === 'Enter' || e.key === 'Tab') && highlightedCustIndex >= 0) {
      e.preventDefault();
      selectCustomer(suggestions[highlightedCustIndex].name, suggestions[highlightedCustIndex].city);
    }
  };


  const selectProduct = p => {
    setProductName(p.name);
    setSelectedProdQty(p.qty || 1);
    setSelectedProdUnit(p.unit || 'pcs');
  setPrice(p.price || '');
  setLessVal(p.less === 'NET' ? '' : p.less?.replace('%', '').trim() || '');
  setLessUnit(p.less === 'NET' ? 'NET' : '%');
  setProdSuggestions([]);
  setValidProduct(true);
  setProductError(false);
  setJustSelectedProduct(true);   // ✅ mark selection before updating name
  qtyInputRef.current?.focus();
};

  const handleProductKeyDown = e => {
    if (!prodSuggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedProdIndex(p => (p + 1) % prodSuggestions.length);
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedProdIndex(p => (p <= 0 ? prodSuggestions.length - 1 : p - 1));
    }
    else if ((e.key === 'Enter' || e.key === 'Tab') && highlightedProdIndex >= 0) {
      e.preventDefault();
      selectProduct(prodSuggestions[highlightedProdIndex]);
    }
  };


  const handleCustomerBlur = () => { if (!validCustomer) setCustomerError(true); };
  const handleProductBlur = () => { if (!validProduct) setProductError(true); };

  const fetchPendingOrders = async (n, c) => {
    try {
      const r = await fetch(`${URL}/pendingOrders.json`), d = await r.json();
      if (!d) return setPendingOrders([]);
      setPendingOrders(Object.entries(d).filter(([_, o]) => o.customerName?.toLowerCase() === n.toLowerCase() && (o.city || '').toLowerCase() === (c || '').toLowerCase()).map(([k, o]) => ({ ...o, key: k, isPending: true })));
    } catch { setPendingOrders([]); }
  };

  const addOrUpdate = () => {
    if (!custName || !city) return alert('Fill all required fields');
    if (!productName) return alert('Select valid product');
    if (!qty && !editing) return alert('Fill all required fields');
    let finalQty = unit === 'pk' ? (qty ? parseFloat(qty) * parseFloat(selectedProdQty) : 0) : qty ? parseFloat(qty) : 0;
    const less = lessUnit === '%'
      ? (lessVal ? `${lessVal} %` : '')
      : lessUnit; // for NET, pair, Full Bill, half Bill

    const newItem = {
  productName,
  unit: selectedProdUnit,
  less,
  qty: finalQty,
  weight,
  price,
  packQty: selectedProdQty,
  packet: unit === 'pk' ? qty : '' // ✅ only keep packet if PK, else empty
};


    if (editing) {
      if (editing.source === 'pending') setPendingOrders(p => p.map((x, i) => i === editing.index ? { ...x, ...newItem } : x));
      else setCustomers(p => { const e = p[custName], items = [...(e?.items || [])]; items[editing.index] = newItem; return { ...p, [custName]: { ...e, items } }; });
    } else {
      setCustomers(p => { const e = p[custName] || { city, timestamp: new Date().toLocaleString(), items: [] }; return { ...p, [custName]: { ...e, items: [...(e.items || []), newItem] } }; });
    }
    resetForm();
  };

  const resetForm = () => {
    setProductName(''); setUnit('pk'); setLessVal(''); setLessUnit('%'); setQty(''); setWeight(''); setPrice('');
    setEditing(null); setValidProduct(false); setProductError(false); setSelectedProdQty(1); setSelectedProdUnit('pcs');
    productInputRef.current?.focus();
  };

  // Helper: Fetch existing customer keys (customer names) for this user from Firebase
  const getExistingCustomerKeys = async (userName) => {
    if (!userName) return [];
    const res = await fetch(`${URL}/orders/${userName}.json`);
    if (!res.ok) return [];
    const data = await res.json();
    return data ? Object.keys(data) : [];
  };

  // Helper: Generate a unique customer name if original exists by appending _1, _2, etc.
  const generateUniqueCustomerName = (existingKeys, baseName) => {
    if (!existingKeys.includes(baseName)) return baseName;
    let counter = 1;
    while (existingKeys.includes(`${baseName}_${counter}`)) {
      counter++;
    }
    return `${baseName}_${counter}`;
  };

  const placeOrder = async (c) => {
    try {
      // 1️⃣ Generate unique ID directly for orders path
      const newCustRes = await fetch(`${URL}/orders/${userName}.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: c.trim(),
          city: city.trim(),
          transportName: transportName.trim(),  // added here
          timestamp: new Date().toLocaleString(),
          items: [],
          pendingOrderRows: []
        })


      });

      const newCustData = await newCustRes.json();
      const customerId = newCustData.name; // Firebase auto-generated ID

      // 2️⃣ Normalize pending orders
      const normalizedPending = pendingOrders.map(({ key, isPending, ...rest }) => ({
        ...rest,
        qty: rest.qty ?? rest.remainingQty
      }));

      const newItems = customers[c]?.items || [];

      const pendingOrderRows = normalizedPending.map(
        ({ productName, qty, unit, weight, price, less, packQty, packet }) => ({
          productName,
          qty,
          unit,
          weight: weight || '',
          price: price || '',
          less:
            (typeof less === 'number' || (typeof less === 'string' && !isNaN(Number(less))))
              ? `${less}%`
              : (less || ''),
          packQty: packQty || '',
          packet: packet ?? '' // ✅ Store packet value
        })
      );



      const items = newItems.map(
        ({ productName, qty, unit, weight, price, less, packQty, packet }) => ({
          productName,
          qty,
          unit,
          weight: weight || '',
          price: price || '',
          less: less || '',
          packQty: packQty || '',
          packet: packet ?? '' // ✅ Store packet value
        })
      );


      // 3️⃣ Merge data with just-created entry
      const bodyToSend = {
        customerName: c.trim(),
        city: city.trim(),
        transportName: transportName.trim(),  // added here
        timestamp: new Date().toLocaleString(),
        items,
        pendingOrderRows
      };


      await fetch(`${URL}/orders/${userName}/${customerId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyToSend)
      });

      // 4️⃣ Delete from pending orders
      for (const p of pendingOrders) {
        await fetch(`${URL}/pendingOrders/${p.key}.json`, { method: 'DELETE' });
      }

      alert(`Order placed for customer "${c}"`);
      resetAllFields();

    } catch (err) {
      alert('Error: ' + err.message);
    }
  };



  const resetAllFields = () => {
    setCustName(''); setCity(''); setProductName(''); setUnit('pk'); setLessVal(''); setLessUnit('%'); setQty('');
    setWeight(''); setPrice(''); setCustomers({}); setPendingOrders([]); setEditing(null); setValidCustomer(false);
    setValidProduct(false); setCustomerError(false); setProductError(false); setSelectedProdQty(1); setSelectedProdUnit('pcs');
    customerInputRef.current?.focus();
    setTransportName('');

  };

  const handleEdit = (type, index) => {
    const item = type === 'pending' ? pendingOrders[index] : customers[custName].items[index];
    const match = item.productName.match(/\((\d+)\s*pcs\)/i); // case-insensitive match for (number pcs)
    const packQty = match ? parseInt(match[1]) : item.packQty || 1;

    setSelectedProdQty(packQty);
    setProductName(item.productName);
    setQty('');
    setWeight(item.weight || '');
    setPrice(item.price || '');
    setLessVal(item.less === 'NET' ? '' : item.less?.replace('%', '').trim() || '');
    setLessUnit(item.less === 'NET' ? 'NET' : '%');
    setUnit('pk');
    setSelectedProdUnit(item.unit || 'pcs');
    setEditing({ source: type, index });
    productInputRef.current.focus();
  };

  const deletePendingItem = async i => {
    const key = pendingOrders[i].key;
    try {
      await fetch(`${URL}/pendingOrders/${key}.json`, { method: 'DELETE' });
      setPendingOrders(p => p.filter((_, x) => x !== i));
    } catch { alert('Failed to delete pending item'); }
  };
  const removePendingItemUI = i => setPendingOrders(p => p.filter((_, x) => x !== i));
  const deleteNewItem = i => setCustomers(p => { const e = p[custName]; return { ...p, [custName]: { ...e, items: e.items.filter((_, x) => x !== i) } }; });

  const pendingList = pendingOrders.map(p => ({ ...p, isPending: true })),
    newItemsList = customers[custName]?.items || [],
    combinedItems = [...pendingList, ...newItemsList];

  return (
    <div className="orderpage-container">
      <h2 style={{ textAlign: 'center' }}>ADD ORDER</h2>
      <div className="orderpage-form">
        <div className="autocomplete-wrapper">
          <input placeholder="Customer Name" value={custName} onChange={handleCustomerChange} onKeyDown={handleCustomerKeyDown} onBlur={handleCustomerBlur} className={customerError ? 'input-error' : ''} ref={customerInputRef} />
          {suggestions.length > 0 && <ul className="suggestions-dropdown" ref={customerListRef}>{suggestions.map((s, i) => <li key={i} className={i === highlightedCustIndex ? 'highlighted' : ''} onClick={() => selectCustomer(s.name, s.city)}>{s.name} — {s.city}</li>)}</ul>}
        </div>

        <input placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
        <div className="autocomplete-wrapper" style={{ position: 'relative' }}>
          <input placeholder="Product" value={productName} onChange={e => setProductName(e.target.value)} onKeyDown={handleProductKeyDown} onBlur={handleProductBlur} autoComplete="off" className={productError ? 'input-error' : ''} ref={productInputRef} />
          {prodSuggestions.length > 0 && (
  <ul
    className="suggestions-dropdown"
    ref={productListRef}
    style={{ position: 'absolute', zIndex: 10 }}
  >
    {prodSuggestions.map((p, i) => (
      <li
        key={i}
        className={i === highlightedProdIndex ? 'highlighted' : ''}
        onClick={() => selectProduct(p)}
      >
        {p.name}
        {(p.price || p.less) && (
          <> — {p.price && <>Price {p.price}</>}
          {p.price && p.less && ' / '}
          {p.less && <>Less {p.less}</>}
          </>
        )}
      </li>
    ))}
  </ul>
)}
        </div>
        <input placeholder="Qty" value={qty} onChange={e => setQty(e.target.value)} ref={qtyInputRef} />
        <div style={{ display: 'flex', gap: '25px', alignItems: 'center', height: '35px' }}>
          <label><input type="radio" name="unit" value="pk" checked={unit === 'pk'} onChange={() => setUnit('pk')} />Pk</label>
          <label><input type="radio" name="unit" value="loose" checked={unit === 'loose'} onChange={() => setUnit('loose')} />Loose</label>
        </div>
        <input placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} />
        <input placeholder="Weight" value={weight} onChange={e => setWeight(e.target.value)} />
        <input
          placeholder="Less Value"
          value={lessVal}
          onChange={e => setLessVal(e.target.value)}
          disabled={lessUnit !== '%'}
          style={{
            backgroundColor: lessUnit !== '%' ? '#e0e0e0' : 'white',
            color: lessUnit !== '%' ? '#7a7a7a' : 'black',
            cursor: lessUnit !== '%' ? 'not-allowed' : 'text'
          }}
        />

        <select value={lessUnit} onChange={e => setLessUnit(e.target.value)}>
          <option value="%">%</option>
          <option value="NET">NET</option>
          <option value="pair">Pair</option>
          <option value="Full Bill">Full Bill</option>
          <option value="half Bill">Half Bill</option>
        </select>
        <input
          placeholder="Transport Name"
          value={transportName}
          onChange={(e) => setTransportName(e.target.value)}
        />



        <button onClick={addOrUpdate}>{editing ? 'Update' : 'Add'}</button>
      </div>
      {custName && combinedItems.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <div className="order-summary-block">
            <div className="summary-header">
              <p><strong>User:</strong> {userName || 'Unknown'}</p>
              <p><strong>Customer:</strong> {custName}, <strong>City:</strong> {city || '-'}</p>
              <p><strong>Date:</strong> {new Date().toLocaleString()}</p>
            </div>
            <div className="table-wrapper">

              <table className="order-table">
                <thead>
                  <tr>
                    <th>Sr No</th> {/* New column */}
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Weight</th>
                    <th>Price</th>
                    <th>Less</th>
                    <th>Packet</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {pendingOrders.map((item, i) => (
                    <tr key={i} className="pending-row">
                      <td>{i + 1}</td> {/* Sr No */}
                      <td>{item.productName}</td>
                      <td>{`${item.qty ?? item.remainingQty} ${item.unit}`}</td>
                      <td>{item.weight || '-'}</td>
                      <td>₹{item.price}</td>
                      <td>
                        {item.less
                          ? (item.less.endsWith('%') ? item.less : item.less)
                          : '-'}
                      </td>
                      <td>{item.packet ?? '-'}</td>
                      <td>
                        <button onClick={() => handleEdit('pending', i)}>Edit</button>
                        <button onClick={() => deletePendingItem(i)}>Delete</button>
                        <button onClick={() => removePendingItemUI(i)}>Remove</button>
                      </td>
                    </tr>
                  ))}

                  {newItemsList.map((item, i) => (
                    <tr key={`new-${i}`}>
                      <td>{pendingOrders.length + i + 1}</td> {/* Continue numbering after pending orders */}
                      <td>{item.productName}</td>
                      <td>{`${item.qty} ${item.unit}`}</td>
                      <td>{item.weight || '-'}</td>
                      <td>₹{item.price}</td>
                      <td>{item.less || '-'}</td>
                      <td>{item.packet ?? '-'}</td>
                      <td>
                        <button onClick={() => handleEdit('new', i)}>Edit</button>
                        <button onClick={() => deleteNewItem(i)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={() => placeOrder(custName)}>Place Order</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderPage;
