// src/component/Header.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Style.css';
import { FaUserCircle, FaBars, FaTimes } from 'react-icons/fa';
import { onDisconnect } from "firebase/database";

import { database } from '../firebase/firebase';  // import from singleton
import { ref, onValue, set } from 'firebase/database';

const specialUsers = ['ammar bhai', 'huzaifa bhai', 'shop','user1', 'user2', 'user3'];

const Header = ({ onLogout }) => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);// ✅ add here



  useEffect(() => {
  const currentUser = sessionStorage.getItem("currentUser");
  if (!currentUser) return;

  const statusRef = ref(database, `users_status/${currentUser}`);

  const unsubscribe = onValue(statusRef, (snap) => {
    if (snap.exists()) {
      const { isLoggedIn } = snap.val();

      // 🚨 If user is force-logged out elsewhere
      if (isLoggedIn === false && !isLoggingOut) {
        setIsLoggingOut(true);

        // 🔔 Top popup
        const popup = document.createElement("div");
        popup.innerHTML = `
          <div id="forceLogoutToast" style="
            position: fixed; top: 0; left: 0; width: 100%;
            background: #dc3545; color: white;
            padding: 14px 0; font-size: 18px; font-weight: 500;
            text-align: center; z-index: 9999;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            transform: translateY(-100%);
            transition: transform 0.4s ease, opacity 0.4s ease;
            opacity: 0;
          ">
            ⚠️ You have been logged out. Redirecting to login...
          </div>
        `;
        document.body.appendChild(popup);

        setTimeout(() => {
          const el = document.getElementById("forceLogoutToast");
          if (el) {
            el.style.transform = "translateY(0)";
            el.style.opacity = "1";
          }
        }, 50);

        // ⏳ Auto logout after 3 seconds
        setTimeout(() => {
          sessionStorage.removeItem("currentUser");
          onLogout();
          navigate("/");

          const el = document.getElementById("forceLogoutToast");
          if (el) {
            el.style.transform = "translateY(-100%)";
            el.style.opacity = "0";
            setTimeout(() => el.remove(), 400);
          }
        }, 3000);
      }
    }
  });

  return () => unsubscribe();
}, [navigate, onLogout, isLoggingOut]);

  useEffect(() => {
  const storedUser = sessionStorage.getItem('currentUser');
  // 🚨 Handle Unknown user immediately
  // 🚨 Handle Unknown user immediately
if (!storedUser || storedUser.toLowerCase() === 'unknown') {
  if (!isLoggingOut) {
    // Popup message (same as before)
    const popup = document.createElement("div");
    popup.innerHTML = `
      <div id="loginAlert" style="
        position: fixed; top: 0; left: 0; width: 100%;
        background: #dc3545; color: white;
        padding: 14px 0; font-size: 18px; font-weight: 500;
        text-align: center; z-index: 9999;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        transform: translateY(-100%);
        transition: transform 0.4s ease, opacity 0.4s ease;
        opacity: 0;
      ">
        ⚠️ You are not logged in. Please login first.
      </div>
    `;
    document.body.appendChild(popup);

    setTimeout(() => {
      const alertBox = document.getElementById("loginAlert");
      if (alertBox) {
        alertBox.style.transform = "translateY(0)";
        alertBox.style.opacity = "1";
      }
    }, 50);

    setTimeout(() => {
      const alertBox = document.getElementById("loginAlert");
      if (alertBox) {
        alertBox.style.transform = "translateY(-100%)";
        alertBox.style.opacity = "0";
        setTimeout(() => {
          if (alertBox.parentNode) alertBox.parentNode.remove();
        }, 400);
      }
    }, 2000);
  }

  // ✅ NEW — Auto mark user as logged out
  const currentUser = sessionStorage.getItem('currentUser');
  if (currentUser) {
    const statusRef = ref(database, `users_status/${storedUser}`);
    set(statusRef, {
      isLoggedIn: false,
      lastLogin: Date.now()
    });
  }
  // 🔄 Auto unlock user when page/tab is closed
window.addEventListener("beforeunload", () => {
  const currentUser = sessionStorage.getItem("currentUser");
  if (currentUser) {
    const statusRef = ref(database, `users_status/${currentUser}`);
    set(statusRef, {
      isLoggedIn: false,
      lastLogin: Date.now()
    });
  }
});


  // Existing logout logic
  onLogout();
  sessionStorage.removeItem('currentUser');
  navigate('/');
  return;
}




  setUserName(storedUser);

  // Skip firebase check for special users
  if (specialUsers.includes(storedUser.toLowerCase())) {
    return;
  }

  const usersRef = ref(database, 'users');
  const unsubscribe = onValue(usersRef, (snapshot) => {
    const usersData = snapshot.val() || {};
    const usersArray = Object.values(usersData);

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
  // ✅ Create linear toast popup
  const popup = document.createElement("div");
  popup.innerHTML = `
    <div id="logoutToast" style="
      position: fixed; top: 0; left: 0; width: 100%;
      background: #28a745; color: white;
      padding: 14px 0; font-size: 18px; font-weight: 500;
      text-align: center; z-index: 9999;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      transform: translateY(-100%);
      transition: transform 0.4s ease, opacity 0.4s ease;
      opacity: 0;
    ">
      ✅ Logging out...
    </div>
  `;
  document.body.appendChild(popup);

  // 🔽 Slide down
  setTimeout(() => {
    const toast = document.getElementById("logoutToast");
    if (toast) {
      toast.style.transform = "translateY(0)";
      toast.style.opacity = "1";
    }
  }, 50);

  // ⏳ Wait, then logout
  setTimeout(() => {
    setIsLoggingOut(true);

    // 🔓 Unlock user in Firebase
    const currentUser = sessionStorage.getItem("currentUser");
    if (currentUser) {
      const statusRef = ref(database, `users_status/${currentUser}`);
      set(statusRef, {
        isLoggedIn: false,
        lastLogin: Date.now()
      });
    }

    onLogout();
    setMenuOpen(false);
    sessionStorage.removeItem("currentUser");
    navigate("/");

    // 🔼 Slide up and remove toast
    const toast = document.getElementById("logoutToast");
    if (toast) {
      toast.style.transform = "translateY(-100%)";
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.remove();
      }, 400);
    }
  }, 1500);
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