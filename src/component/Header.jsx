// src/component/Header.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Style.css';
import { FaUserCircle, FaBars, FaTimes } from 'react-icons/fa';

import { database } from '../firebase/firebase';  // import from singleton
import { ref, onValue } from 'firebase/database';

const specialUsers = ['ammar bhai', 'huzaifa bhai'];

const Header = ({ onLogout }) => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      setUserName(storedUser);
    }

    // Skip firebase check for special users
    if (storedUser && specialUsers.includes(storedUser.toLowerCase())) {
      return;
    }

    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val() || {};
      const usersArray = Object.values(usersData); // array of "username:password"

      if (storedUser) {
        const lowerStoredUser = storedUser.toLowerCase();
        const userExists = usersArray.some(u =>
          u.toLowerCase().startsWith(lowerStoredUser + ':')
        );

        if (!userExists) {
          alert('Your account has been deleted or you are not authorized. Logging out.');
          onLogout();
          sessionStorage.removeItem('currentUser');
          navigate('/');
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [navigate, onLogout]);

  const isAllowedUser = specialUsers.includes(userName.toLowerCase());

  const handleNavigate = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setMenuOpen(false);
    sessionStorage.removeItem('currentUser');
    navigate('/');
  };

  return (
    <>
      <header className="app-header">
        <div className="user-profile">
          <FaUserCircle className="profile-icon" />
          <span className="user-name">{userName || 'Unknown'}</span>
        </div>

        {/* Desktop buttons */}
        {/* Desktop buttons */}
<div className="header-controls">
  <button onClick={() => handleNavigate('/order')} className="view-orders-btn">Order Page</button>
  <button onClick={() => handleNavigate('/view-orders')} className="view-orders-btn">View Orders</button>
  <button onClick={() => handleNavigate('/pending-orders')} className="view-orders-btn">Pending Orders</button>
  <button onClick={() => handleNavigate('/view-items')} className="view-orders-btn">View Items</button>
  <button onClick={() => handleNavigate('/edit-add-product')} className="view-orders-btn">Add Product</button> {/* NEW BUTTON */}

  {isAllowedUser && (
    <>
      <button onClick={() => handleNavigate('/user-handle')} className="view-orders-btn">User Handle</button>
      <button onClick={() => handleNavigate('/add-product')} className="view-orders-btn">Add Product</button>
      <button onClick={() => handleNavigate('/sell-order')} className="view-orders-btn">Sell Order</button>
    </>
  )}

  <button onClick={handleLogout} className="logout-btn">Logout</button>
</div>

{/* Slide menu for mobile */}
<nav className={`mobile-slide-menu ${menuOpen ? 'open' : ''}`}>
  <button onClick={() => handleNavigate('/order')} className="slide-menu-btn">Order Page</button>
  <button onClick={() => handleNavigate('/view-orders')} className="slide-menu-btn">View Orders</button>
  <button onClick={() => handleNavigate('/pending-orders')} className="slide-menu-btn">Pending Orders</button>
  <button onClick={() => handleNavigate('/view-items')} className="slide-menu-btn">View Items</button>
  <button onClick={() => handleNavigate('/edit-add-product')} className="slide-menu-btn">Add Product</button> {/* NEW BUTTON */}

  {isAllowedUser && (
    <>
      <button onClick={() => handleNavigate('/user-handle')} className="slide-menu-btn">User Handle</button>
      <button onClick={() => handleNavigate('/add-product')} className="slide-menu-btn">Add Product</button>
      <button onClick={() => handleNavigate('/sell-order')} className="slide-menu-btn">Sell Order</button>
    </>
  )}

  <button onClick={handleLogout} className="slide-menu-btn logout-btn">Logout</button>
</nav>


        {/* Hamburger icon for mobile */}
        <div className="hamburger-menu" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </div>
      </header>

      {/* Slide menu for mobile */}
      <nav className={`mobile-slide-menu ${menuOpen ? 'open' : ''}`}>
        <button onClick={() => handleNavigate('/order')} className="slide-menu-btn">Order Page</button>
        <button onClick={() => handleNavigate('/view-orders')} className="slide-menu-btn">View Orders</button>
        <button onClick={() => handleNavigate('/pending-orders')} className="slide-menu-btn">Pending Orders</button>
        <button onClick={() => handleNavigate('/view-items')} className="slide-menu-btn">View Items</button> {/* NEW BUTTON */}

        {isAllowedUser && (
          <>
            <button onClick={() => handleNavigate('/user-handle')} className="slide-menu-btn">User Handle</button>
            <button onClick={() => handleNavigate('/add-product')} className="slide-menu-btn">Add Product</button>
            <button onClick={() => handleNavigate('/sell-order')} className="slide-menu-btn">Sell Order</button>
          </>
        )}

        <button onClick={handleLogout} className="slide-menu-btn logout-btn">Logout</button>
      </nav>

      {/* Overlay to close menu when clicked outside */}
      {menuOpen && <div className="menu-overlay" onClick={() => setMenuOpen(false)}></div>}
    </>
  );
};

export default Header;
