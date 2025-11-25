import React, { useState, useEffect, useRef } from 'react';
import { getDatabase, ref, update } from "firebase/database";
import './Style.css';
const URL = 'https://mb-order-60752-default-rtdb.firebaseio.com/';
const SellAddProduct = () => {
    const db = getDatabase();
    
    const [matchedOrder, setMatchedOrder] = useState(null);
    const [transportName, setTransportName] = useState('');
    const [userName, setUserName] = useState('');
    const [custName, setCustName] = useState('');
    const [city, setCity] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [prodSuggestions, setProdSuggestions] = useState([]);
    const [customers, setCustomers] = useState({});
    const [editing, setEditing] = useState(null);
    const [productName, setProductName] = useState('');
    const [unit, setUnit] = useState('pk');
    const [lessVal, setLessVal] = useState('');
    const [lessUnit, setLessUnit] = useState('%');
    const [qty, setQty] = useState('');
    const [weight, setWeight] = useState('');
    const [price, setPrice] = useState('');
    const [selectedProdQty, setSelectedProdQty] = useState(1);
    const [selectedProdUnit, setSelectedProdUnit] = useState('pcs');
    const [validCustomer, setValidCustomer] = useState(false);
    const [validProduct, setValidProduct] = useState(false);
    const [customerError, setCustomerError] = useState(false);
    const [productError, setProductError] = useState(false);
    const [justSelectedCustomer, setJustSelectedCustomer] = useState(false);
    const [highlightedCustIndex, setHighlightedCustIndex] = useState(-1);
    const [highlightedProdIndex, setHighlightedProdIndex] = useState(-1);
    const [justSelectedProduct, setJustSelectedProduct] = useState(false);
    const [loading, setLoading] = useState(false);
    const [kgRate, setKgRate] = useState('');
    const [matchedOrders, setMatchedOrders] = useState([]);
    const newItemsList = customers[custName]?.items || [];

    const refDebCust = useRef(null),
        refDebProd = useRef(null),
        productInputRef = useRef(null),
        customerInputRef = useRef(null),
        customerListRef = useRef(null),
        productListRef = useRef(null);
    const qtyInputRef = useRef(null);

    useEffect(() => {
        const searchOrderById = async () => {
            try {
                // 1️⃣ Fetch all AddSellOrder IDs
                const addOrderRes = await fetch(`${URL}/AddSellOrder.json`);
                const addOrderData = await addOrderRes.json();
                if (!addOrderData) return;
                for (const [id] of Object.entries(addOrderData)) {
                    // 2️⃣ For each ID → search inside sellOrders
                    const sellRes = await fetch(`${URL}/sellOrders.json`);
                    const sellData = await sellRes.json();
                    if (!sellData) continue;
                    for (const [orderId, orderObj] of Object.entries(sellData)) {
                        if (orderId === id) {
                            setMatchedOrder({ orderId, ...orderObj });
                            return; // ✅ Stop after first match
                        }
                    }
                }
            } catch (err) {
                console.error("Error while searching AddSellOrder in sellOrders:", err);
            }
        };
        searchOrderById();
    }, []);

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

  // ✅ normalization function (removes special chars & spaces)
  const normalize = str =>
    str.toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '');

  refDebProd.current = setTimeout(async () => {
    try {
      // ✅ fetch once
      const [prodRes, sellRes] = await Promise.all([
        fetch(`${URL}/products.json`),
        fetch(`${URL}/sellOrders.json`)
      ]);

      const d = await prodRes.json();
      const sellData = await sellRes.json();

      if (!d) return setProdSuggestions([]);

      const searchTerm = normalize(productName);
      const allProducts = Object.values(d);

      // ✅ Pre-normalize product names (much faster filtering)
      const suggestions = allProducts
        .filter(p => normalize(p.name || '').includes(searchTerm))
        .map(p => {
          const match = p.name.match(/\((\d+)\s*([a-zA-Z]+)\)/);
          return {
            name: p.name,
            qty: match ? parseInt(match[1]) : 1,
            unit: match ? match[2] : 'pcs',
            price: null,
            less: null
          };
        });

      // ✅ Customer-specific price/less mapping
      if (custName?.trim() && sellData) {
        const custOrders = Object.values(sellData).filter(
          o => o.customerName?.toLowerCase().trim() === custName.toLowerCase().trim()
        );

        custOrders.forEach(order => {
          if (Array.isArray(order.items)) {
            order.items.forEach(item => {
              const match = suggestions.find(
                s =>
                  normalize(s.name) === normalize(item.productName || '') ||
                  normalize(s.name).includes(normalize(item.productName || '')) ||
                  normalize(item.productName || '').includes(normalize(s.name))
              );

              if (match) {
                match.price = item.price || null;
                match.less = item.less || null;
              }
            });
          }
        });
      }

      setProdSuggestions(suggestions.slice(0, 10));
      setHighlightedProdIndex(-1);
    } catch (e) {
      console.error(e);
      setProdSuggestions([]);
    }
  }, 10); // ✅ reduced delay for faster response
}, [productName, custName, justSelectedProduct]);

    // taha taha taha taha
    const checkOrderId = async (id) => {
        try {
            // 1️⃣ Check if id exists in addOrder
            const res = await fetch(`${URL}/addOrder/${id}.json`);
            const data = await res.json();
            if (!data) return; // id not present in addOrder
            // 2️⃣ Now search inside orders/{user}
            const ordersRes = await fetch(`${URL}/orders.json`);
            const ordersData = await ordersRes.json();
            if (!ordersData) return;
            for (const [user, custOrders] of Object.entries(ordersData)) {
                for (const [orderId, orderObj] of Object.entries(custOrders)) {
                    if (orderId === id) {
                        setMatchedOrder({ user, orderId, ...orderObj });
                        return;
                    }
                }
            }
        } catch (err) {
            console.error("Error checking order id:", err);
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            // ✅ Find all focusable elements inside the page
            const focusable = Array.from(
                document.querySelectorAll(
                    'input, select, textarea, button'
                )
            ).filter(el => !el.disabled && el.type !== "hidden");
            const index = focusable.indexOf(e.target);
            if (index >= 0) {
                focusable[index + 1]?.focus();
            }
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

    const selectCustomer = (n, c) => {
        setCustName(n);
        setCity(c || '');
        setSuggestions([]);
        setValidCustomer(true);
        setCustomerError(false);
        setJustSelectedCustomer(true);
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
        setLessVal(
            ['NET', 'Pair', 'Half Bill', 'Full Bill'].includes(p.less)
                ? ''
                : p.less?.replace('%', '').trim() || ''
        );

        setLessUnit(
            ['NET', 'Pair', 'Half Bill', 'Full Bill'].includes(p.less)
                ? p.less
                : '%'
        );

        setProdSuggestions([]);
        setValidProduct(true);
        setProductError(false);

        setJustSelectedProduct(true);   // ✅ lock suggestions until cleared
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

    const addOrUpdate = () => {
        // ✅ Only enforce dropdown selection in ADD mode
        if (!editing) {
            if (!validProduct) return showAlert('Please select a valid product from the list');
        }
        if (!custName || !city) return showAlert('Fill all required fields');
        if (!productName) return showAlert('Select valid product');
        if (!qty && !editing) return showAlert('Fill all required fields');
        let finalQty =
            unit === 'pk'
                ? (qty ? parseFloat(qty) * parseFloat(selectedProdQty) : 0)
                : qty
                    ? parseFloat(qty)
                    : 0;

        const less =
            lessUnit === '%'
                ? (lessVal ? `${lessVal} %` : '')
                : lessUnit; // for NET, pair, Full Bill, half Bill

        const newItem = {
            productName,
            unit: selectedProdUnit,
            less,
            qty: finalQty,
            weight,
            price,
            kgRate,   // ✅ keep per-item
            packQty: selectedProdQty,
            packet: unit === 'pk' ? qty : '' // ✅ only keep packet if PK, else empty
        };

        if (editing) {
            setCustomers(p => {
                const e = p[custName],
                    items = [...(e?.items || [])];
                items[editing.index] = newItem;
                return { ...p, [custName]: { ...e, items } };
            });
        } else {
            setCustomers(p => {
                const e = p[custName] || {
                    city,
                    timestamp: new Date().toLocaleString(),
                    items: []
                };
                return {
                    ...p,
                    [custName]: { ...e, items: [...(e.items || []), newItem] }
                };
            });
        }
        resetForm();
    };

    const resetForm = () => {
        setProductName(''); setUnit('pk'); setLessVal(''); setLessUnit('%'); setQty(''); setWeight(''); setPrice(''); setKgRate('');
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
            const newItems = customers[c]?.items || [];
            const pendingOrderRows = [];

            const items = newItems.map(
                ({ productName, qty, unit, weight, price, kgRate, less, packQty, packet }) => ({
                    productName,
                    qty,
                    unit,
                    weight: weight || '',
                    price: price || '',
                    kgRate: kgRate || '',   // ✅ take from item
                    less: less || '',
                    packQty: packQty || '',
                    packet: packet ?? ''
                })
            );
            // 3️⃣ Merge data with just-created entry
            const bodyToSend = {
                customerName: c.trim(),
                city: city.trim(),
                transportName: transportName.trim(),  // added here
                timestamp: new Date().toLocaleString(),
                items,
            };

            await fetch(`${URL}/orders/${userName}/${customerId}.json`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyToSend)
            });
            // 4️⃣ Delete from pending orders
            showAlert(`Order placed for customer "${c}"`);
            resetAllFields();
        } catch (err) {
            showAlert('Error: ' + err.message);
        }
    };

    const resetAllFields = () => {
        setCustName(''); setCity(''); setProductName(''); setUnit('pk'); setLessVal(''); setLessUnit('%'); setQty('');
        setWeight(''); setPrice(''); setCustomers({}); setEditing(null); setValidCustomer(false);
        setValidProduct(false); setCustomerError(false); setProductError(false); setSelectedProdQty(1); setSelectedProdUnit('pcs');
        customerInputRef.current?.focus();
        setTransportName('');
    };

    const updateOldItem = async () => {
  if (!editing) return;
  if (!matchedOrder?.user || !matchedOrder?.orderId) return;

  // ✅ qty calculation logic (unchanged)
  let finalQty =
    unit === "pk"
      ? (qty ? parseFloat(qty) * parseFloat(selectedProdQty) : 0)
      : qty
        ? parseFloat(qty)
        : 0;

  // packet logic
  const finalPacket = unit === "pk" ? qty : "";

  // ============================================
  // 1) UPDATE sellOrders (same as before)
  // ============================================
  const sellRef = ref(
    db,
    `sellOrders/${matchedOrder.orderId}/items/${String(editing.index)}`
  );

  const updatedData = {
    productName,
    unit: selectedProdUnit,
    qty: finalQty,
    price,
    less: lessVal,
    kgRate,
    packQty: selectedProdQty,
    packet: finalPacket,
  };

  await update(sellRef, updatedData);

  // ============================================
  // 2) UPDATE ORIGINAL ORDER → originalQty only
  // ============================================
  const originalItemRef = ref(
    db,
    `orders/${matchedOrder.user}/${matchedOrder.orderId}/items/${String(editing.index)}`
  );

  // 🔥 update originalQty instead of qty
  await update(originalItemRef, { originalQty: finalQty });

  // ============================================
  // 3) UPDATE UI (same logic)
  // ============================================
  setMatchedOrder((prev) => {
    const newState = { ...prev };

    if (prev.items && prev.items[editing.index]) {
      const arr = [...prev.items];
      arr[editing.index] = { 
        ...arr[editing.index], 
        ...updatedData, 
        originalQty: finalQty 
      };
      newState.items = arr;
    }

    if (prev.pendingOrderRows && prev.pendingOrderRows[editing.index]) {
      const arr2 = [...prev.pendingOrderRows];
      arr2[editing.index] = { 
        ...arr2[editing.index], 
        ...updatedData, 
        originalQty: finalQty 
      };
      newState.pendingOrderRows = arr2;
    }

    return newState;
  });

  setEditing(null);
  resetForm();
};



    const handleEdit = (type, index) => {
  let item;

  if (type === 'new') {
    item = newItemsList[index];
  } else if (type === 'old' && matchedOrder?.items) {
    item = matchedOrder.items[index];
  } else {
    showAlert("No items found to edit!");
    return;
  }

  if (!item) {
    showAlert("Item not found at this index!");
    return;
  }

  const match = item.productName?.match(/\((\d+)\s*pcs\)/i);
  const packQty = match ? parseInt(match[1]) : item.packQty || 1;

  setSelectedProdQty(packQty);
  setProductName(item.productName || '');
  setQty(item.packet || item.qty || '');
  setWeight(item.weight || '');
  setPrice(item.price || '');
  setKgRate(item.kgRate || '');
  setLessVal(
    ['NET', 'Pair', 'Half Bill', 'Full Bill'].includes(item.less)
      ? ''
      : item.less?.replace('%', '').trim() || ''
  );
  setLessUnit(
    ['NET', 'Pair', 'Half Bill', 'Full Bill'].includes(item.less)
      ? item.less
      : '%'
  );

  setUnit('pk');
  setSelectedProdUnit(item.unit || 'pcs');
  setEditing({ source: type, index });

  qtyInputRef.current?.focus();
};


    const deleteNewItem = i => setCustomers(p => { const e = p[custName]; return { ...p, [custName]: { ...e, items: e.items.filter((_, x) => x !== i) } }; });

    useEffect(() => {
        if (matchedOrder) {
            // Autofill customer and city when an order is matched
            setCustName(matchedOrder.customerName || '');
            setCity(matchedOrder.city || '');
            // ✅ Autofocus the product input field
            productInputRef.current?.focus();
        }
    }, [matchedOrder]);

    return (
        <div className="orderpage-container">
            <h2 style={{ textAlign: 'center' }}>ADD ORDER</h2>
            <div className="orderpage-form">
                <div className="autocomplete-wrapper">
                    <input placeholder="Customer Name" value={custName} onChange={handleCustomerChange} onKeyDown={handleCustomerKeyDown} onBlur={handleCustomerBlur} className={customerError ? 'input-error' : ''} ref={customerInputRef} />
                </div>
                <input placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
                <div className="autocomplete-wrapper" style={{ position: 'relative' }}>
                    <input
                        placeholder="Product"
                        value={productName}
                        onChange={e => {
                            const val = e.target.value;
                            setProductName(val);
                            // ✅ Reset justSelectedProduct if user types something new
                            if (val !== productName) {
                                setJustSelectedProduct(false);
                            }
                        }}
                        onKeyDown={handleProductKeyDown}
                        onBlur={handleProductBlur}
                        autoComplete="off"
                        className={productError ? 'input-error' : ''}
                        ref={productInputRef}
                    />

                    {/* ✅ Only show dropdown in Add mode */}
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
                <input
                    placeholder="Qty"
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    ref={qtyInputRef}
                    onKeyDown={handleKeyDown}   // ✅ added
                />

                <div style={{ display: 'flex', gap: '25px', alignItems: 'center', height: '35px' }}>
                    <label>
                        <input
                            type="radio"
                            name="unit"
                            value="pk"
                            checked={unit === 'pk'}
                            onChange={() => setUnit('pk')}
                            onKeyDown={handleKeyDown}   // ✅ added
                        />
                        Pk
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="unit"
                            value="loose"
                            checked={unit === 'loose'}
                            onChange={() => setUnit('loose')}
                            onKeyDown={handleKeyDown}   // ✅ added
                        />
                        Loose
                    </label>
                </div>

                <input
                    placeholder="Price"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    onKeyDown={handleKeyDown}   // ✅ added
                />

                <input
                    placeholder="KG Rate"
                    value={kgRate}
                    onChange={e => setKgRate(e.target.value)}
                    onKeyDown={handleKeyDown}
                />

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
                    onKeyDown={handleKeyDown}   // ✅ added
                />

                <select
                    value={lessUnit}
                    onChange={e => {
                        setLessUnit(e.target.value);
                    }}
                    onBlur={e => {
                        // Trigger next focus when leaving the select (after selection)
                        handleKeyDown({
                            key: "Enter",
                            preventDefault: () => { },
                            target: e.target
                        });
                    }}
                >
                    <option value="%">%</option>
                    <option value="NET">NET</option>
                    <option value="Pair">Pair</option>
                    <option value="Full Bill">Full Bill</option>
                    <option value="Half Bill">Half Bill</option>
                </select>
                <button
  onClick={() => {
    if (editing?.source === "old") {
      updateOldItem(); // 🔥 only updates the specific Firebase item
    } else {
      addOrUpdate();   // ✅ same behavior for new items
    }
  }}
>
  {editing ? "Update" : "Add"}
</button>


            </div>
            {/* taha taha taha */}
            {matchedOrder && (
                <div style={{ marginTop: 30 }}>
                    <div className="order-summary-block">
                        <div className="summary-header">
                            <p><strong>User:</strong> {matchedOrder.user || 'Unknown'}</p>
                            <p><strong>Customer:</strong> {matchedOrder.customerName}, <strong>City:</strong> {matchedOrder.city || '-'}</p>
                           <p><strong>Date:</strong> {new Date(matchedOrder.timestamp).toLocaleDateString('en-GB')}</p>


                        </div>
                        <div className="table-wrapper">
                            <table className="order-table">
                                <thead>
                                    <tr>
                                        <th>Sr No</th>
                                        <th>Product</th>
                                        <th>Qty</th>
                                        {/* <th>Weight</th>  ✅ hidden */}
                                        <th>KG Rate</th>   {/* ✅ new column */}
                                        <th>Price</th>
                                        <th>Less</th>
                                        <th>Packet</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* matched order items */}
                                    {matchedOrder.items?.map((item, i) => (
                                        <tr key={i}>
                                            <td>{i + 1}</td>
                                            <td>{item.productName}</td>
                                            <td>{item.originalQty ? `${item.originalQty} ${item.unit || ''}` : item.qty ? `${item.qty} ${item.unit || ''}` : '-'}</td>  {/* ✅ Qty with unit */}
                                            <td>{item.kgRate || '-'}</td>
                                            <td>₹{item.price}</td>
                                            <td>{item.less || '-'}</td>
                                            <td>{item.packet || '-'}</td>
                                            <td>
                                                <button onClick={() => handleEdit('old', i)}>Edit</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {/* new items */}
                                    {newItemsList.map((item, i) => (
                                        <tr key={`new-${i}`}>
                                            <td>{i + 1}</td>
                                            <td>{item.productName}</td>
                                            <td>{`${item.qty} ${item.unit}`}</td>
                                            <td>{item.kgRate || '-'}</td>   {/* ✅ KG Rate */}
                                            <td>₹{item.price}</td>
                                            <td>{item.less || '-'}</td>
                                            <td>{item.packet || '-'}</td>
                                            <td>
                                                <button onClick={() => handleEdit('new', i)}>Edit</button>
                                                <button onClick={() => deleteNewItem(i)}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {newItemsList.length > 0 && (
                        <div style={{ textAlign: "center", marginTop: "20px" }}>
                            <button
                                onClick={async () => {
                                    setLoading(true); // start loader
                                    try {
                                        if (!matchedOrder?.user || !matchedOrder?.orderId) {
                                            showAlert("No order selected!");
                                            return;
                                        }
                                        const items = newItemsList.map(
                                            ({ productName, qty, unit, weight, price, kgRate, less, packQty, packet }) => ({
                                                productName,
                                                soldQty: 0,
                                                unit,
                                                weight: weight || '',
                                                kgRate: kgRate || '',  // ✅ take from item
                                                price: price || '',
                                                less: less || '',
                                                originalQty: qty || 0,
                                                packet: packet ?? ''
                                            })
                                        );
                                        const updatedItems = [...(matchedOrder.items || []), ...items];
                                        await fetch(
                                            `${URL}/sellOrders/${matchedOrder.orderId}.json`,
                                            {
                                                method: "PATCH",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ items: updatedItems }),
                                            }
                                        );
                                        setMatchedOrder((prev) => ({ ...prev, items: updatedItems }));
                                        setCustomers((p) => ({ ...p, [custName]: { ...p[custName], items: [] } }));

                                        showAlert("Items added to order!");
                                    } catch (err) {
                                        showAlert("Error: " + err.message);
                                    } finally {
                                        setLoading(false); // stop loader
                                    }
                                }}
                                disabled={loading}
                            >
                                {loading ? <div className="loader"></div> : "Add Order"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
export default SellAddProduct;