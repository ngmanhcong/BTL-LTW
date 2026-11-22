import { configureStore } from '@reduxjs/toolkit';
import userSlice from './slices/userSlice';
import createPostSlice from './slices/createPostSlice';
import createSoketSlice from './slices/socketSlice';

export const store = configureStore({
  reducer: {
    user: userSlice,
    createPost: createPostSlice,
    soketSlice: createSoketSlice,
  },
});
