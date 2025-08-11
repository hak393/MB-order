// src/redux/UserSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  users: [], // ✅ Start with an empty user list
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUsers: (state, action) => {
      state.users = action.payload;
    },
    addUser: (state, action) => {
      state.users.push(action.payload);
    },
    deleteUser: (state, action) => {
      state.users = state.users.filter(user => user !== action.payload);
    },
  },
});

export const { setUsers, addUser, deleteUser } = userSlice.actions;
export default userSlice.reducer;
