// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './UserSlice';

const loadState = () => {
  try {
    const serializedState = localStorage.getItem('reduxState');
    return serializedState ? JSON.parse(serializedState) : undefined;
  } catch (e) {
    console.warn('Failed to load state:', e);
    return undefined;
  }
};

const saveState = (state) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem('reduxState', serializedState);
  } catch (e) {
    console.warn('Failed to save state:', e);
  }
};

const store = configureStore({
  reducer: {
    user: userReducer,
  },
  preloadedState: loadState(), // 🟡 Load persisted state
});

store.subscribe(() => {
  saveState({
    user: store.getState().user, // 🟢 Persist only user slice
  });
});

export default store;
