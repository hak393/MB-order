// src/component/Signin.jsx
import React, { useState, useEffect } from 'react';
import './Style.css';
import { FaSun, FaMoon } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

const firebaseConfig = {
  databaseURL: 'https://mb-order-60752-default-rtdb.firebaseio.com/',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

const Signin = ({ onLogin }) => {
  console.log("📄 Signin.jsx: Component rendering started");

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const mode = localStorage.getItem('darkMode') === 'true';
    console.log("🌗 Dark mode from localStorage:", mode);
    return mode;
  });

  useEffect(() => {
    console.log("🎯 Signin.jsx mounted");
    return () => {
      console.log("🚪 Signin.jsx unmounted (navigated away)");
    };
  }, []);

  useEffect(() => {
    console.log("🌙 Dark mode changed to:", darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedUserName = userName.trim();
    const trimmedPassword = password.trim();

    console.log("🖊 Form submitted with:", { trimmedUserName, trimmedPassword });

    setLoading(true);
    console.log("⏳ Checking credentials...");

    let isValid = false;

    // Step 1: Check Firebase
    try {
      console.log("🔍 Step 1: Checking Firebase users...");
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const userList = Object.values(data); // array of strings "username:password"
        const loginString = `${trimmedUserName}:${trimmedPassword}`;
        console.log("Looking for", loginString, "in Firebase users");
        if (userList.includes(loginString)) {
          console.log("✅ User found in Firebase");
          isValid = true;
        } else {
          console.log("❌ User NOT found in Firebase");
        }
      } else {
        console.log("⚠ No users found in Firebase");
      }
    } catch (error) {
      console.error("🚨 Error fetching users from Firebase:", error);
      toast.error('Error accessing user database.');
    }

    // Step 2: Check file.txt if not found in Firebase
    if (!isValid) {
      console.log("🔍 Step 2: Checking file.txt...");
      try {
        const response = await fetch('/file.txt');
        console.log("📁 file.txt fetch status:", response.status);

        if (!response.ok) throw new Error('File not found');

        const text = await response.text();
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        console.log("📄 file.txt content lines:", lines);

        isValid = lines.some(line => {
          const [fileUser, filePass] = line.split(',');
          if (!fileUser || !filePass) return false;
          const match = fileUser.toLowerCase() === trimmedUserName && filePass === trimmedPassword;
          if (match) console.log(`✅ Match found in file.txt for user: ${fileUser}`);
          return match;
        });

        if (!isValid) console.log("❌ No match found in file.txt");
      } catch (err) {
        console.error("🚨 Error reading user file:", err);
        toast.error('Error reading user file.');
      }
    }

    // Step 3: Final decision
    if (isValid) {
      console.log("🎉 Login successful");
      sessionStorage.setItem('currentUser', trimmedUserName);
      toast.success('Successfully signed in!');
      setTimeout(() => {
        console.log("➡ Navigating to next page for user:", trimmedUserName);
        onLogin(trimmedUserName);
      }, 900);
    } else {
      console.log("❌ Login failed: Invalid username or password");
      toast.error('Invalid username or password');
    }

    setLoading(false);
    console.log("✅ Finished login process");
  };

  const toggleTheme = () => {
    console.log("🌗 Theme toggle clicked. Current mode:", darkMode);
    setDarkMode(prev => !prev);
  };

  return (
    <div className={`signin-container ${darkMode ? 'dark' : 'light'}`}>
      <div className="form-wrapper">
        <h2>Sign In</h2>
        <form onSubmit={handleSubmit}>
          <label>User Name</label>
          <input
            onChange={(e) => {
              console.log("⌨ Username input changed:", e.target.value);
              setUserName(e.target.value);
            }}
            value={userName}
            type="text"
            placeholder="Enter user name"
            required
          />
          <label>Password</label>
          <input
            onChange={(e) => {
              console.log("⌨ Password input changed");
              setPassword(e.target.value);
            }}
            value={password}
            type="password"
            placeholder="Enter password"
            required
            autoComplete="current-password"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Checking...' : 'Submit'}
          </button>
        </form>
        <button
          className="theme-toggle icon-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {darkMode ? <FaSun /> : <FaMoon />}
        </button>
      </div>
      <ToastContainer position="top-center" autoClose={2500} hideProgressBar />
    </div>
  );
};

export default Signin;
