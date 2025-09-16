import React, { useState, useEffect } from 'react';
import './Style.css';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  push,
  get,
  remove,
} from 'firebase/database';
import { useNavigate } from 'react-router-dom';

const firebaseConfig = {
  databaseURL: 'https://mb-order-3764e-default-rtdb.firebaseio.com/',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

const UserHandle = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  const currentUser = sessionStorage.getItem('currentUser')?.toLowerCase();

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const loadedUsers = Object.values(data);
      setUsers(loadedUsers);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const deletedUser = localStorage.getItem('deletedUser');
      if (deletedUser && deletedUser.toLowerCase() === currentUser) {
        sessionStorage.removeItem('currentUser');
        localStorage.removeItem('deletedUser');
        showAlert('Your account was deleted. You have been logged out.');
        navigate('/');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentUser, navigate]);

  const handleAdd = async () => {
      if (!username.trim() || !password.trim()) {
    showAlert("Both Username and Password are required.");
    return;
  }

    const newUser = `${username}:${password}`;
    if (users.includes(newUser)) {
      showAlert('User already exists.');
      return;
    }
    try {
      const usersRef = ref(db, 'users');
      await push(usersRef, newUser);
      setUsername('');
      setPassword('');
      showAlert('User added successfully.');
    } catch (error) {
      console.error('Error adding user:', error);
      showAlert('Failed to add user.');
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
  

  const handleDelete = async () => {
      if (!username.trim() || !password.trim()) {
    showAlert("Both Username and Password are required.");
    return;
  }
    const targetUser = `${username}:${password}`;
    if (!users.includes(targetUser)) {
      showAlert('User not found.');
      return;
    }
    try {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      const data = snapshot.val() || {};
      const entry = Object.entries(data).find(([, val]) => val === targetUser);
      if (!entry) {
        showAlert('User not found in database.');
        return;
      }
      const [key] = entry;
      await remove(ref(db, `users/${key}`));
      const [deletedUsername] = targetUser.split(':');
      localStorage.setItem('deletedUser', deletedUsername);
      setUsername('');
      setPassword('');
      showAlert('User deleted successfully.');
    } catch (error) {
      console.error('Error deleting user:', error);
      showAlert('Failed to delete user.');
    }
  };

  return (
    <div className="user-handle">
      <h2>User Manager</h2>
      <input
  type="text"
  placeholder="Username"
  value={username}
  onChange={e => setUsername(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && document.querySelector('input[placeholder="Password"]').focus()}
  className="input-field"
/><br />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="input-field"
      /><br />
      <button onClick={handleAdd}>Add User</button>
      <button onClick={handleDelete}>Delete User</button>

      <h3>Users</h3>
      {users.length === 0 ? (
        <p className="no-user">No users added yet.</p>
      ) : (
        <ul className="user-list">
          {users.map((u, i) => {
            const [user, pass] = u.split(':');
            return (
              <li key={i}>
                <strong>Username:</strong> <span className="user-name">{user}</span> |{' '}
                <strong>Password:</strong> <span className="user-pass">{pass}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default UserHandle;
