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
  databaseURL: 'https://project-file-53396-default-rtdb.firebaseio.com',
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
        alert('Your account was deleted. You have been logged out.');
        navigate('/');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentUser, navigate]);

  const handleAdd = async () => {
    const newUser = `${username}:${password}`;
    if (users.includes(newUser)) {
      alert('User already exists.');
      return;
    }
    try {
      const usersRef = ref(db, 'users');
      await push(usersRef, newUser);
      setUsername('');
      setPassword('');
      alert('User added successfully.');
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user.');
    }
  };

  const handleDelete = async () => {
    const targetUser = `${username}:${password}`;
    if (!users.includes(targetUser)) {
      alert('User not found.');
      return;
    }
    try {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      const data = snapshot.val() || {};
      const entry = Object.entries(data).find(([, val]) => val === targetUser);
      if (!entry) {
        alert('User not found in database.');
        return;
      }
      const [key] = entry;
      await remove(ref(db, `users/${key}`));
      const [deletedUsername] = targetUser.split(':');
      localStorage.setItem('deletedUser', deletedUsername);
      setUsername('');
      setPassword('');
      alert('User deleted successfully.');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user.');
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
