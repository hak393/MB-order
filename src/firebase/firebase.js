// src/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBAafTGN4sis7PKHMK-QUG9lejvz-B3CBs",
  authDomain: "mb-order-3764e.firebaseapp.com",
  projectId: "mb-order-3764e",
  storageBucket: "mb-order-3764e.firebasestorage.app",
  messagingSenderId: "1046206045643",
  appId: "1:1046206045643:web:1b661518cd0970783faa4e",
  measurementId: "G-N6DCV65JN3",
  databaseURL: "https://mb-order-3764e-default-rtdb.firebaseio.com"
};

// Initialize Firebase app only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const database = getDatabase(app);

export { app, database };
