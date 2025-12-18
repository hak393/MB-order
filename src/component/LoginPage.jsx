// src/component/Signin.jsx
import React, { useState, useEffect } from 'react';
import './Style.css';
import { FaSun, FaMoon } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { set } from "firebase/database";


import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, get, onValue } from 'firebase/database';

const firebaseConfig = {
  databaseURL: 'https://mb-order-60752-default-rtdb.firebaseio.com/',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

const Signin = ({ onLogin }) => {
  console.log("📄 Signin.jsx: Component rendering started");
  const [statusPasswordInput, setStatusPasswordInput] = useState("");
  const [userStatus, setUserStatus] = useState(null); // 'ON' | 'OFF' | null
  const USER_STATUS_PASSWORD = "status@123"; // 🔐 change this to anything
  const [statusPassword, setStatusPassword] = useState("");
  const [isCredValid, setIsCredValid] = useState(false);




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
  if (!isCredValid || !userName.trim()) return;

  const statusRef = ref(db, `users_status/${userName.trim().toLowerCase()}`);

  const unsub = onValue(statusRef, (snap) => {
    if (snap.exists() && snap.val().isLoggedIn === true) {
      setUserStatus("OFF");
    } else {
      setUserStatus("ON");
    }
  });

  return () => unsub();
}, [isCredValid, userName]);




  useEffect(() => {
  if (!userName.trim() || !password.trim()) {
    setUserStatus(null);
    return;
  }

  const checkStatusWithPassword = async () => {
    try {
      // 🔐 1. Check status-password
      const passSnap = await get(ref(db, "user_status_password/password"));

      if (!passSnap.exists()) {
        setUserStatus(null);
        return;
      }

      const statusPassword = passSnap.val();

      // ❌ Password does NOT match → do nothing
      if (password !== statusPassword) {
        setUserStatus(null);
        return;
      }

      // ✅ Password matched → now check login status
      const statusRef = ref(
        db,
        `users_status/${userName.trim().toLowerCase()}`
      );

      const unsubscribe = onValue(statusRef, (snap) => {
        if (snap.exists() && snap.val().isLoggedIn === true) {
          setUserStatus("OFF");
        } else {
          setUserStatus("ON");
        }
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Status password check failed", err);
      setUserStatus(null);
    }
  };

  checkStatusWithPassword();
}, [userName, password]);


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
      // Step 3: Final decision
if (isValid) {

  // 🛑 Step 2.5: Check if already logged in on another device
  try {
    const statusRef = ref(db, `users_status/${trimmedUserName}`);
    const statusSnap = await get(statusRef);

    if (statusSnap.exists() && statusSnap.val().isLoggedIn === true) {
      console.log("❌ User already logged in on another device");
      toast.error("This user is already logged in on another phone!");
      setLoading(false);
      return; // stop login
    }

    // If not logged in, mark user as logged in
    // If not logged in, mark user as logged in
await set(statusRef, {
  isLoggedIn: true,
  lastLogin: Date.now()
});

setUserStatus("ON");   // ✅ SHOW USER STATUS AFTER SUCCESS LOGIN

console.log("🔓 User login status updated to: LOGGED IN");

  } catch (error) {
    console.error("🔥 Error checking login status:", error);
  }

  // ⬇️ THIS LINE MUST REMAIN AFTER THE NEW CODE
  console.log("🎉 Login successful");

  sessionStorage.setItem('currentUser', trimmedUserName);
  toast.success('Successfully signed in!');
  setTimeout(() => {
    console.log("➡ Navigating to next page for user:", trimmedUserName);
    onLogin(trimmedUserName);
  }, 900);
}

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

  const forceTurnOnUser = async () => {
  try {
    const passSnap = await get(ref(db, "user_status_password/password"));

    if (!passSnap.exists()) {
      toast.error("Status password not set");
      return;
    }

    const firebaseStatusPassword = passSnap.val();

    // ✅ compare with STATUS password input
    if (statusPasswordInput !== firebaseStatusPassword) {
      toast.error("Invalid status password");
      return;
    }

    const statusRef = ref(db, `users_status/${userName.trim().toLowerCase()}`);

    await set(statusRef, {
      isLoggedIn: false,
      lastForcedOn: Date.now()
    });

    setUserStatus("ON");
    setStatusPasswordInput("");
    toast.success("User status turned ON");

  } catch (err) {
    console.error(err);
    toast.error("Failed to update status");
  }
};





  const toggleTheme = () => {
    console.log("🌗 Theme toggle clicked. Current mode:", darkMode);
    setDarkMode(prev => !prev);
  };
  useEffect(() => {
  const checkUserStatus = async () => {
    if (!userName.trim() || !password.trim()) {
      setUserStatus(null);
      return;
    }

    const u = userName.trim().toLowerCase();
    const p = password.trim();
    let valid = false;

    // 🔹 1. Firebase users
    try {
      const snap = await get(ref(db, "users"));
      if (snap.exists()) {
        const users = Object.values(snap.val());
        valid = users.includes(`${u}:${p}`);
      }
    } catch {}

    // 🔹 2. file.txt users
    if (!valid) {
      try {
        const res = await fetch("/file.txt");
        const txt = await res.text();
        valid = txt.split("\n").some(line => {
          const [fu, fp] = line.trim().split(",");
          return fu?.toLowerCase() === u && fp === p;
        });
      } catch {}
    }

   if (!valid) {
  setIsCredValid(false);
  setUserStatus(null);
  return;
}

setIsCredValid(true);


    // 🔹 3. Check login status
    const statusSnap = await get(ref(db, `users_status/${u}`));

    if (statusSnap.exists() && statusSnap.val().isLoggedIn === true) {
      setUserStatus("OFF"); // already logged in
    } else {
      setUserStatus("ON"); // available
    }
  };

  const t = setTimeout(checkUserStatus, 400);
  return () => clearTimeout(t);
}, [userName, password]);



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

          {userStatus && (
  <div style={{ marginTop: "8px" }}>
    <span
      style={{
        fontWeight: "bold",
        color: userStatus === "ON" ? "green" : "red"
      }}
    >
      Status: {userStatus}
    </span>

    {userStatus === "OFF" && (
  <div style={{ marginTop: "6px" }}>
    <input
      type="password"
      placeholder="Status password"
      value={statusPasswordInput}
      onChange={(e) => setStatusPasswordInput(e.target.value)}
      style={{ padding: "4px" }}
    />

    <button
      onClick={forceTurnOnUser}
      style={{
        marginLeft: "8px",
        background: "green",
        color: "white",
        border: "none",
        padding: "4px 10px",
        cursor: "pointer"
      }}
    >
      ON
    </button>
  </div>
)}
  </div>
)}


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
